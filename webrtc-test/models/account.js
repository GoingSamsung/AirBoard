const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const accountSchema = new Schema({
    email: {
        type: String,
        required: true,
    },

    password: {
        type: String,
        required: true,
    }, 
    
    name: {
        type: String,
        required: true,
    }
});

module.exports = mongoose.model('account', accountSchema);
