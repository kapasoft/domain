require('coffee-script');
Domain = require './domain'

class Review extends Domain
  save:(args) ->
    console.log "Saveing From Review..."
    super args

module.exports  = Review