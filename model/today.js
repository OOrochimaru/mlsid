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
    },
    activestatus: {
        type: Boolean,
    },
    closeDate:{
        type: Date
    },
    closePrice: {
        type: Number
    }

});

module.exports = mongoose.model('today', MlsSchema);