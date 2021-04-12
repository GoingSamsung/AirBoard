const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
    userName: {
        type: String,
        required: true,
    },
    userId: {
        type: String,
        required: true,
    },
    roomid: {
        type: String,
        required: true,
    },
    isHost: {
        type: Boolean,
        default: false,
    }
});

module.exports = mongoose.model('user', userSchema);
