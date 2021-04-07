const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
    /*userName: {
        type: String,
        required: true,
    },*/
    id: {
        type: String,
        required: true,
    },
    roomid: {
        type: String,
        required: true,
    }
});

module.exports = mongoose.model('user', userSchema);
