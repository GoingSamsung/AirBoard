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
    roomId: {
        type: String,
        required: true,
    },
    isHost: {
        type: Boolean,
        default: false,
    },
    isMute: {
        type: Boolean,
        default: false,
    },
    isCam: {
        type: Boolean,
        default: true,
    }
});

module.exports = mongoose.model('user', userSchema);
