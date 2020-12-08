"use strict";

var express = require('express');
var router = express.Router();

//Middleware
var middleware = require('./middleware');

// Mongoose
var mongoose = require('mongoose');
mongoose.connect('mongodb+srv://admin:admin123@timeline.9e4sd.mongodb.net/timeline?retryWrites=true&w=majority',
    { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true, useFindAndModify: false });
var db = mongoose.connection;

// Les models
var utilisateurModel = require('../database/Utilisateur');
var partieModel = require('../database/Partie');

router.get('/', middleware.checkToken, function (req, res) {
    partieModel.find(null, function (err, parties) {
        if (err) { throw err; }
        res.render('listepartie', { parties: parties });
    });
});

router.get('/:id_partie', middleware.checkToken, function (req, res) {
    partieModel.findById(req.params.id_partie, function (err, partie) {
        res.send({ id: partie._id, invites: partie.invites });
    });
});


module.exports = router;