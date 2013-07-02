require('coffee-script');
Domain = require './domain'

class Newsletter extends Domain
  save:(args) ->
    console.log "Saving From Newsletter..."
    super args

module.exports  = Newsletter