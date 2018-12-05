var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var MlsSchema = new Schema({
    propertyID: {
        type: String
    },
    count: {
        type: Number
    },
    imageURI: [{
        type: String
    }],
    property: {
        type: Object
    },
    lastModified: {
        type: Date
    },
    ListingContractDate: {
        type: Date
    }

});

module.exports = mongoose.model('mlsproperties', MlsSchema);