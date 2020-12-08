"use strict";

const mongoose = require('mongoose');
// mongoose.connect('mongodb://localhost/timeline', {useNewUrlParser: true});

const db = mongoose.connection;

const CarteSchema = new mongoose.Schema({
    cue: String,
    show: String,
    rep: Number
});

module.exports = mongoose.model('Carte', CarteSchema);