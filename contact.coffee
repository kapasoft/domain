require('coffee-script');
Domain = require './domain'

class Contact extends Domain
  save:(args) ->
    console.log "Saveing From Contact..."
    super args

module.exports  = Contact