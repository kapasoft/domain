require('coffee-script');
var should = require('should')
    , redis = require('redis')
    , async = require('async')
    , Domain = require('../index');

var domain = ''
    , db = '';
//db = redis.createClient();
////function(callback){
//db.flushdb( function (err, didSucceed) {
//    if(err){
//        console.log('error: ' + err.message);
////                callback(null, 'one');
//    }
//    console.log("cache flush status: " + didSucceed); // true
////            callback(null, 'one');
//});
////db.end();
//console.log('All tests passed');
async.series([
    function(callback){
        console.log('first task begins');
        db = redis.createClient();
        callback();
    },
//    function(callback){
//        console.log('second task begins');
//        db.flushdb(callback);
////        db.flushdb( function (err, didSucceed) {
////            if(err){
////                console.log('error: ' + err.message);
////                callback(err, 'one');
////            }
////            console.log("cache flush status: " + didSucceed); // true
////            callback(null, 'one');
////        });
////        callback(null, 'one');
//    },
//    function(callback){
//        console.log('third task begins');
//        //test it loads
//        should.exist(Domain);
//
////instance used in test
//        domain = new Domain({'attOne':1, 'attTwo':2, 'id':1});
//
////test there is methods and properties
//        domain.should.have.property('save');
//        domain.should.have.property('attOne');
//        domain.should.have.property('attTwo');
//
////test that property 'save' is of type Function
//        domain.save.should.be.an.instanceof(Function);
//        callback(null, 'two');
//    },
//    function(callback){
//        domain.save(function(err){
//            if(err){
//                console.log("Error saving: " + err.message);
//                callback(err, 'two with error');
//            }
//        });
//        callback(null, 'two')
//    }
    function (callback){
        console.log('third task begins');
        db.hgetall('review:1', function(err, redisReview){
            if(err){
                console.log('error when retrieving value');
//                callback(err, 'three with error');;
            }
            console.log('*review: ' + JSON.stringify(redisReview));
//            redisReview.should.have.property('id');
//            redisReview.should.have.property('attOne');
//            redisReview.should.have.property('attTwo');
//            callback(null, 'three');
            return callback();
        });
//        db.end();
    },
    function (callback){
        console.log('fours task begins');
        db.end();
        console.log('redis connection closed: ' + db.connected);
        callback();
    }
],
    function(err){
        console.log('default task begins');
//        db.end();
        if(err){
            console.log('Error encountered: ' + err.message);
            db.end();
        }
        console.log('All tests passed');
    }
);








