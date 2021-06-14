const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userdataSchema = new Schema({
    userName: {
        type: String,
        required: [true, 'A user must set username'],
    },
    userId: {
        type: String,
        required: true,
    },
    password: {
        type: String,
        required:true,
    },
    purchase: {
        type: Boolean,
        default:false,
    }
});

module.exports = mongoose.model('userdata', userdataSchema);
