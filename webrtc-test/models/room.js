const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const roomSchema = new Schema({
    userId: {
        type: String,
        required: true,
    },
    roomid: {
        type: String,
        required: true,
    },
    participant:{
        type:Number,
        default:0,
        
    }
});

module.exports = mongoose.model('room', roomSchema);
