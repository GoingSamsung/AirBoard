const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const roomSchema = new Schema({
    hostId: {
        type: String,
        required: true,
    },
    roomId: {
        type: String,
        required: true,
    },
    participant:{
        type:Number,
        default:0,
        
    }
});

module.exports = mongoose.model('room', roomSchema);
