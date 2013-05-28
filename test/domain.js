require('coffee-script');
var redis = require('redis')
    , http = require('http')
    , nock = require('nock')
    , assert = require('assert')
    , should = require('should')
    , Domain = require('../domain');

var domain
    , db = redis.createClient()
    , client =''
    , minDriver=''
    , attrOne = 'attrOne'
    , attrTwo = 'attrTwo'
    , version = 'version'
    , id = 'id'
    , ID = 1
    , VER = 5
    , message, domainName, dbTable, cacheTable, listTable;

suite('Successful SAVE: ', function(){
    suiteSetup(function(){
        domain = new Domain({attrOne:1, attrTwo:2});
        domainName = domain.constructor.name.toLowerCase();
        dbTable = domainName + ':' + ID;
        cacheTable = 'cache:' + domainName + ':' + ID;
        listTable = domainName + 's';

        minDriver = nock('http://localhost:3002')
            //.log(console.log)
            .filteringRequestBody(function(path) {
                return '*';
            })
            .post('/minnehaha/api/' + domain.constructor.name.toLowerCase() + '/', '*')
            .reply(201, {id: ID, version: VER, attrOne: "1", attrTwo: "2"});
    });

    suite('Test: ', function(){
        test('ensure all properties and methods are present', function(){
            //test it loads
            should.exist(Domain);

//test there is methods and properties
            domain.should.have.property('save');
            domain.should.have.property(attrOne);
            domain.should.have.property(attrTwo);
            domain.should.not.have.property(id);
//            domain.should.have.property(id);

//test that property 'save' is of type Function
            domain.save.should.be.an.instanceof(Function);
        });

        test('ensure redis storage is empty before saving...', function(done){
            db.multi()
                .zremrangebyscore(listTable, 0, -1)
                .hdel(dbTable , id, attrOne, attrTwo)
                .hdel(cacheTable, 'remote', 'local')
                .exec(done);
        });

        test('saving review...', function(done){
            domain.save(function(err){
                should.not.exist(err);
            });
            done();
        });

        test('ensure domain saved in redis',function(done){
            db.hgetall(dbTable, function(err, redisDomain){
                should.not.exist(err);

                redisDomain.should.have.property(id);
                redisDomain.id.should.equal(ID.toString());
                redisDomain.should.have.property(attrOne);
                redisDomain.should.have.property(attrTwo);
                done();
            });
        });

        test('ensure domain saved in cache',function(done){
            db.hgetall(cacheTable, function(err, redisDomain){
                should.not.exist(err);
                redisDomain.should.have.property('remote');
                redisDomain.remote.should.equal(VER.toString());
                redisDomain.should.have.property('local');
                redisDomain.local.should.equal(VER.toString());
                done();
            });
        });

        test('ensure domain added to the list of domains',function(done){
            db.zscore(listTable, ID, function(err, domainId){
                should.not.exist(err);
                should.exist(domainId);
                ID.should.equal(+domainId);//to make it numbrer
                done();
            });
        });

    });
});

suite(' SAVE on Controller Error: ', function(){
    suiteSetup(function(){
        domain = new Domain({attrOne:1, attrTwo:2});
        message = "Property of class cannot be null";
        minDriver = nock('http://localhost:3002')
            //.log(console.log)
            .filteringRequestBody(function(path) {
                return '*';
            })
            .post('/minnehaha/api/' + domain.constructor.name.toLowerCase() + '/', '*')
            .reply(200, [{"field": "userEmail"},{"message":message}]);
    });


    suite('Test: ', function(){
        test('ensure error message from controller handled ', function(done){
            domain.save(function(err){
                err.message.should.be.equal(message);
            });
            done();
        });

    });

});

suite(' Removing Domain From Cache: ', function(){
    suiteSetup(function(){
        domain = new Domain({id: ID, attrOne:1, attrTwo:2});
        domainName = domain.constructor.name.toLowerCase();
        dbTable = domainName + ':' + ID;
        cacheTable = 'cache:' + domainName + ':' + ID;
        listTable = domainName + 's';
        minDriver = nock('http://localhost:3002')
            .filteringRequestBody(function(path) {
                return '*';
            })
            .post('/minnehaha/api/' + domain.constructor.name.toLowerCase() + '/', '*')
            .reply(201, {id: ID, version: VER, attrOne: "1", attrTwo: "2"});

    });


    suite('Test: ', function(){
        test('saving domain... ', function(done){
            domain.save(function(err){
                should.not.exist(err);
            });
            done();
        });

        test('removing domain... ', function(done){
            domain.remove(function(err){
                should.not.exist(err);
            });
            done();
        });

        test('ensure domain does not exist redis ', function(done){
            db.hgetall(dbTable, function(err, redisDomain){
                should.not.exist(err);
                should.not.exist(redisDomain)
                done();
            });
        });

        test('ensure domain does not exist in cache ', function(done){
            db.hgetall(cacheTable, function(err, redisDomain){
                should.not.exist(err);
                should.not.exist(redisDomain);
                done();
            });
        });
        test('ensure domain is not in domain list ', function(done){
            db.zscore(listTable, ID, function(err, domainId){
                should.not.exist(err);
                should.not.exist(domainId);
                done();
            });
        });
    });
});

suite('Reset Cache: ', function(){
    suiteSetup(function(){
        ID = 2;
        VER = 10;
        domain = new Domain({id: ID, attrOne:1, attrTwo:2, version: VER});
        domainName = domain.constructor.name.toLowerCase();
        dbTable = domainName + ':' + ID;
        cacheTable = 'cache:' + domainName + ':' + ID;

    });


    suite('Test: ', function(){
        test('ensure redis cache storage is empty before reseting cache', function(done){
            db.hdel(cacheTable, 'remote', 'local', function(err){
                should.not.exist(err);
            });
            done();
        });
        test('reseting cache... ', function(done){
            domain.resetCache(function(err){
                should.not.exist(err);
            });
            done();
        });

        test('ensure cache reset ', function(done){
            db.hgetall(cacheTable, function(err, redisDomain){
                should.not.exist(err);
                redisDomain.should.have.property('remote');
                redisDomain.remote.should.equal(VER.toString());
                redisDomain.should.have.property('local');
                redisDomain.local.should.equal(VER.toString());
            });
            done();
        });
    });
});


suite('UPDATE Version in Cache: ', function(){
    var newVer;
    suiteSetup(function(){
        ID = 2;
        newVer = "11";
        domain = new Domain({id: ID, attrOne:1, attrTwo:2, version: VER});
        domainName = domain.constructor.name.toLowerCase();
        dbTable = domainName + ':' + ID;
        cacheTable = 'cache:' + domainName + ':' + ID;
        listTable = domainName + 's';
    });


    suite('Test: ', function(){
        test('remove cache before updating', function(done){
            db.hdel(cacheTable, 'remote', 'local', function(err){
                should.not.exist(err);
            });
            done();
        });

        test('remove id from domain list before updating', function(done){
            db.zrem(listTable, ID, function(err){
                should.not.exist(err);
            });
            done();
        });

        test('updating version in cache... ', function(done){
            domain.updateVersion(domain.id, newVer, function(err){
                should.not.exist(err);
            });
            done();
        });

        test('ensure version updated in cache', function(done){
            db.hgetall(cacheTable, function(err, redisDomain){
                should.not.exist(err);
                redisDomain.should.have.property('remote');
                redisDomain.remote.should.equal(newVer);
            });
            done();
        });

        test('ensure id is present in domain list', function(done){
            db.zscore(listTable, ID, function(err, domainId){
                should.not.exist(err);
                should.exist(domainId);
                ID.should.equal(+domainId);//to make it numbrer
            });
            done();
        });

    });
});

suite('Domain Is Dirty : ', function(){
    var newVer;
    suiteSetup(function(){
        ID = 2;
        newVer = "11";
        domain = new Domain({id: ID, attrOne:1, attrTwo:2, version: VER});
        domainName = domain.constructor.name.toLowerCase();
        dbTable = domainName + ':' + ID;
        cacheTable = 'cache:' + domainName + ':' + ID;
        listTable = domainName + 's';
    });


    suite('Test - is Dirty: ', function(){
        test('set cache for domain to be dirty', function(done){
            db.hmset(cacheTable, {remote: domain.version + 1, local: domain.version }, function(err, args){
                should.not.exist(err);
            });
            done();
        });

        test('check if domain is dirty', function(done){
            Domain.isDirty(domain.id, domain.constructor.name, function(err, dirty){
                should.not.exist(err);
                dirty.should.be.ok;
            });
            done();
        });
    });

    suite('Test - is not Dirty: ', function(){
        test('set cache for domain to be NOT dirty', function(done){
            db.hmset(cacheTable, {remote: domain.version, local: domain.version }, function(err, args){
                should.not.exist(err);
            });
            done();
        });

        test('check if domain is NOT dirty', function(done){
            Domain.isDirty(domain.id, domain.constructor.name, function(err, dirty){
                should.not.exist(err);
                dirty.should.not.be.ok;
            });
            done();
        });
    });
});

suite('Retrieve Domain : ', function(){
    var newVer;
    suiteSetup(function(){
        ID = 2;
        newVer = "11";
        domain = new Domain({id: ID, attrOne:1, attrTwo:2, version: VER});
        domainName = domain.constructor.name.toLowerCase();
        dbTable = domainName + ':' + ID;
        cacheTable = 'cache:' + domainName + ':' + ID;
        listTable = domainName + 's';
        minDriver = nock('http://localhost:3002')
            .get('/minnehaha/api/' + domain.constructor.name.toLowerCase() + '/' + domain.id)
            .reply(201, {id: ID, version: VER+1, attrOne: "1", attrTwo: "2"});
    });

    suite('Test - Retrieve with Up To Date Cache- not Dirty: ', function(){
        test('ensure redis storage is empty before running test...', function(done){
            db.multi()
                .zremrangebyscore(listTable, 0, -1)
                .hdel(dbTable , id, attrOne, attrTwo, version)
                .hdel(cacheTable, 'remote', 'local')
                .exec(done);
        });

        test('set cache for domain to be not dirty', function(done){
            db.hmset(cacheTable, {remote: domain.version, local: domain.version }, function(err, args){
                should.not.exist(err);
            });
            done();
        });

        test('insert the domain in storage', function(done){
            db.hmset(("" + (domain.constructor.name.toLowerCase()) + ":") + domain.id, domain, function(err, args) {
               should.not.exist(err);
            });
            done();
        });

        test('retrieve domain from cache', function(done){
            Domain.get(domain.id, domain.constructor.name, function(err, cachedDomain){
                should.not.exist(err);
                should.exist(cachedDomain);
                cachedDomain.id.should.equal(domain.id.toString())
            });
            done();
        });
    });

    suite('Test - Retrieve with Dirty Cache: ', function(done){
        test('ensure redis storage is empty before running test...', function(done){
            db.multi()
                .zremrangebyscore(listTable, 0, -1)
                .hdel(dbTable , id, attrOne, attrTwo, version)
                .hdel(cacheTable, 'remote', 'local')
                .exec(done);
        });

        test('set cache to be dirty', function(done){
            db.hmset(cacheTable, {remote: newVer, local: domain.version }, function(err, args){
                should.not.exist(err);
            });
            done();
        });

        test('insert the domain in storage', function(done){
            db.hmset(("" + (domain.constructor.name.toLowerCase()) + ":") + domain.id, domain, function(err, args) {
                should.not.exist(err);
            });
            done();
        });

        test('retrieve domain from cache', function(done){
            Domain.get(domain.id, domain.constructor.name, function(err, cachedDomain){
                should.not.exist(err);
                should.exist(cachedDomain);
                cachedDomain.id.should.equal(+domain.id);
                cachedDomain.version.should.equal(+newVer);
                cachedDomain.should.have.property(attrOne);
                cachedDomain.should.have.property(attrTwo);
            });
            done();
        });

        test('ensure chache is up to date - not dirty', function(done){
            db.hgetall(cacheTable, function(err, redisDomain){
                should.not.exist(err);
                redisDomain.should.have.property('remote');
                redisDomain.remote.should.equal(newVer);
                redisDomain.should.have.property('local');
                redisDomain.local.should.equal(newVer);
            });
            done();
        });

    });
});

suite('Retrieve Range of Domains : ', function(){
    var newVer, ID_2;
    suiteSetup(function(){
        ID = 2;
        ID_2 = 3;
        newVer = "11";
        domainOne = new Domain({id: ID, attrOne:1, attrTwo:2, version: VER});
        domainTwo = new Domain({id: 3, attrOne:1, attrTwo:2, version: VER});
        domainName = domainOne.constructor.name.toLowerCase();
        dbTable = domainName + ':' + ID;
        dbTable_2 = domainName + ':' + ID_2;
        cacheTable = 'cache:' + domainName + ':' + ID;
        cacheTable_2 = 'cache:' + domainName + ':' + ID_2;
        listTable = domainName + 's';
    });

    suite('Test - Retrieve with Up To Date Cache- not Dirty: ', function(){
        test('ensure redis storage is empty before running test...', function(done){
            db.multi()
                .zremrangebyscore(listTable, 0, -1)
                .hdel(dbTable , id, attrOne, attrTwo, version)
                .hdel(dbTable_2 , id, attrOne, attrTwo, version)
                .hdel(cacheTable, 'remote', 'local')
                .hdel(cacheTable_2, 'remote', 'local')
                .exec(done);
        });

        test('set cache for domain to be not dirty', function(done){
            db.hmset(cacheTable, {remote: domainOne.version, local: domainOne.version }, function(err, args){
                should.not.exist(err);
                db.hmset(cacheTable_2, {remote: domainTwo.version, local: domainTwo.version }, function(err, args){
                    should.not.exist(err);
                });
            });
            done();
        });

        test('insert the domain one and two in storage', function(done){
            db.hmset(dbTable, domainOne, function(err, args) {
                should.not.exist(err);
                db.hmset(dbTable_2, domainTwo, function(err, args) {
                    should.not.exist(err);
                });

            });
            done();
        });

        test('update the domains list in storage', function(done){
            db.zadd(listTable, ID, ID, function(err, args){
                should.not.exist(err);
                db.zadd(listTable, ID_2, ID_2, function(err, args){
                    should.not.exist(err);
                });
            });
            done();
        });

        test('retrieve list of domains', function(done){
            Domain.getRange(0, -1, domain.constructor.name, function(err, listOfDomains){
                should.not.exist(err);
                should.exist(listOfDomains);
                listOfDomains.should.have.length(2);
                listOfDomains[0].toString().should.equal(domainOne.toString());
                listOfDomains[1].toString().should.equal(domainTwo.toString());

            });
            done();
        });
    });
});






