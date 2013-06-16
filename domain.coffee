#require('coffee-script');
redis = require 'redis'
db = redis.createClient()
http = require 'http'

class Domain
  constructor: (obj) ->
    for own key, value of obj
      @[key] = value

  save: (fn) ->
    self = @
    post_data = JSON.stringify(@)
    options =
      host: process.env.CONTROLLER_HOST || "localhost"
      port: process.env.CONTROLLER_PORT || 3002
      path: process.env.CONTROLLER_URL || "/minnehaha/api/"
      method: "POST"
      headers:
        'Content-Type': "application/json"
        'Content-Length': post_data.length
    options.path += "#{self.constructor.name.toLowerCase()}/"

    req = http.request options, (res) ->
      body = ''
      res.setEncoding 'utf8'

      res.on 'data', (chunk) ->
        body += chunk

      res.on 'end', () ->
        newDomain = JSON.parse(body)

        if newDomain[0]?
          console.log "ERROR from Controller. " + newDomain[0].field + ':' + newDomain[1].message
          return fn newDomain[1]

        db.zadd "#{self.constructor.name.toLowerCase()}s", newDomain.id, newDomain.id, (err, args) ->
          if err
            console.log 'error saving in redis  sorted list - reviews'
            return fn err

        db.hmset "#{self.constructor.name.toLowerCase()}:" + newDomain.id, newDomain, (err, args) ->
          if err
            console.log('error saving redis in hash review:id')
            return fn err

        db.hmset "cache:#{self.constructor.name.toLowerCase()}:" + newDomain.id, {remote: newDomain.version, local: newDomain.version }, (err, args) ->
          if err
            console.log 'error saving redis in cache hash - cache:review:id'
            return fn err

        return fn null

    req.on 'error', (e) ->
      console.log 'problem with POST Review request to controller: ' + e.message

    req.write post_data + '\n'
    req.end '\n'

  remove: (fn) ->
    domain = @constructor.name.toLowerCase()
    db.multi()
      .zrem("#{domain}s", @id)
      .del("#{domain}:#{@id}")
      .del("cache:#{domain}:#{@id}", 'remote', 'local')
      .exec(fn)

  resetCache: (fn) ->
    db.hmset "cache:#{@constructor.name.toLowerCase()}:#{@id}", {remote: @version, local: @version}, (err) ->
      if err
        console.log 'Error Reseting Cache: ' + err.message
        return fn err
      fn null

  updateVersion: (id, ver, fn) ->
    db.hmset "cache:#{@constructor.name.toLowerCase()}:#{id}", {remote: ver}, (err) ->
      if err
        console.log 'Error updating version in Cache: ' + err.message
        return fn err

    db.zadd "#{@constructor.name.toLowerCase()}s", id, id, (err, args) ->
      if err
        console.log 'error saving in redis  sorted list - reviews'
        return fn err

    fn null

Domain.isDirty = (id, domainClassName, fn) ->
    cacheTable = "cache:#{domainClassName.toLowerCase()}:#{id}"
    db.hgetall cacheTable, (err,args) ->
      if err
        console.log 'Error in isDirty(): ' + err.message
        fn err

      if args? and args.remote == args.local
        fn null, false
      else
        fn null, true

Domain.get = (id, domainClassName, fn) ->
  Domain.isDirty id, domainClassName, (err, dirty) ->
    domainClasNameLowerCase = domainClassName.toLowerCase()
    if dirty
      #cache is not up to date, so make request
      options =
        host: process.env.CONTROLLER_HOST || "localhost"
        port: process.env.CONTROLLER_PORT || 3002
        path: process.env.CONTROLLER_URL || "/minnehaha/api/"
      options.path += "#{domainClasNameLowerCase}/#{id}"

      http.get options, (res) ->
        rawDomain = '';
        res.setEncoding 'utf8'

        res.on 'data', (chunk) ->
          rawDomain += chunk

        res.on 'end', () ->
          newDomain = JSON.parse(rawDomain)

          db.zadd "#{domainClasNameLowerCase}s", newDomain.id, newDomain.id, (err, args) ->
            if err
              console.log 'error saving in redis  sorted list - reviews'
              return fn err

          db.hmset "#{domainClasNameLowerCase}:" + newDomain.id, newDomain, (err, args) ->
            if err
              console.log('error saving redis in hash review:id')
              return fn err

          db.hmset "cache:#{domainClasNameLowerCase.toLowerCase()}:" + newDomain.id, {remote: newDomain.version, local: newDomain.version }, (err, args) ->
            if err
              console.log 'error saving redis in cache hash - cache:review:id'
              return fn err

          return fn null, newDomain
      .on 'error', (e) ->
        console.log 'Got error when requesting for update: ' + e.message
        fn e, null
    else
      db.hgetall "#{domainClasNameLowerCase}:#{id}", (err, cachedDomain) ->
        if err
          fn err

#        if not cachedDomain.id
        fn null, null if not cachedDomain.id? #@todo: impliment GET request

        DomainClass = require("./#{domainClasNameLowerCase}")
        newDomain = new DomainClass(cachedDomain)
        fn null, newDomain

Domain.getRange = (from, to, domainName, fn) ->
  db.zrange "#{domainName.toLowerCase()}s", from, to, (err, ids) ->
    if err
      fn err

    pending = ids.length
    reviews = []
    done = false

    fn null, [] if not pending?

    ids.forEach (id) ->
      Domain.get id, domainName, (err, newDomain) ->
        if done
          return
        if err
          done = true
          fn err

        reviews.push newDomain
        --pending || fn null, reviews

module.exports = Domain