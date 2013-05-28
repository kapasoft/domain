module.exports  = Domain; //exports Review function from the model

function Domain(obj){
    var self = this;
    for (var key in obj){ //iterate keys in the object passed
        this[key] = obj[key]; //merge values
    }
}

Domain.prototype.save = function(fn){

}