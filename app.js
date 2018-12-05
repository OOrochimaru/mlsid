var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var mongoose = require('mongoose');
var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
const request = require('request');
var Mlsschema = require('./model/mls');
var Today = require('./model/today')
var Promise = require('bluebird');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);


mongoose.connect("mongodb://127.0.0.1:27017/mlsid").then(() => {
  console.log("db connect")
}, () => { console.log("err"); });


const options = {
  url: 'https://api.github.com/repos/request/request',
  headers: {
    'User-Agent': 'request'
  }
};


//steps
//1. get token ->  localhost:3000/token (compulsory at initial run of the application)
//2. get list of all modified property since 1950 -> localhost:3000/list1950
//3. get info(list, modifieddate, images, active status etc) of all modified properties today -> localhost:3000/modifiedtoday

var token;
app.get('/token', function (req, res) {
  request.post('https://stage.retsrabbit.com/api/oauth/access_token', {
    form:
    {
      grant_type: 'client_credentials',
      client_id: '8zM7Z8xgVqeXgC2APKTSM08NHsgQWHOxmXHXL48q',
      client_secret: '0fja7hQMrlj8LrzdmeVyCj2IstKXdwTDHdY7Sl4p'
    }
  }, function (error, response, body) {
    token = JSON.parse(body);

    return res.json(token);
  });
});
app.get('/list1950', function (req, res) {
  request.get({
    url: 'https://stage.retsrabbit.com/api/v2/property?$filter=year(ModificationTimestamp) gt 1950',
    headers: {
      'Authorization': "Bearer " + token.access_token
    }, json: true
  }, function (err, response, body) {
    console.log(token.access_token)
    property = body;
    var mls = new Mlsschema({
      property: property,
      count: property.value.length
    });
    mls.save();
    console.log(property)
    return res.json({ property: property, count: property.value.length })
  })
});


//get every information on 
app.get('/photosurl', function (req, res) {
  request.get({
    url: 'https://stage.retsrabbit.com/api/v2/property?$filter=year(ModificationTimestamp) gt 2012',
    headers: {
      'Authorization': "Bearer " + token.access_token
    }, json: true
  }, function (err, response, body) {
      let newBody = body.value.map((value)=>{
        return {
          propertyID:value.listing.mls_id,
          lastModified: value.ModificationTimestamp,
          ListingContractDate: value.ListingContractDate,
          imageURI:value.listing.photos.map((photo)=>{
            return photo.url;
          }),
        }
      });
      Mlsschema.insertMany(newBody).then(function(results){
        return res.json({'success':true});
      }).catch(err=>{
        return res.json({'success':false});

      })
      
  })
});
//bluebird promise
app.get('/photosurl1', function (req, res) {
  request.get({
    url: 'https://stage.retsrabbit.com/api/v2/property?$filter=year(ModificationTimestamp) gt 2012',
    headers: {
      'Authorization': "Bearer " + token.access_token
    }, json: true
  }, function (err, response, body) {
    console.log(token.access_token)
    property = body;
    var mls = new Mlsschema();
    var createPromise = property.value.map(async value => {
      mls.propertyID = value.listing.mls_id;
      mls.count = property.value.length
      var img = [];
      await value.listing.photos.map(photos => {
        img.push(photos.url);
        // mls.imageURI[value.listing.photos.indexOf(photos)] = photos.url;
      });
      return Mlsschema.create(
        {
          propertyID: value.listing.mls_id,
          count: property.value.length,
          lastModified: value.ModificationTimestamp,
          imageURI: img,
          ListingContractDate: value.ListingContractDate
        })
    });
    Promise.all(createPromise).then(function (result) {
      console.log(result)
    })

    // mls.save()  

    return res.json({
      estateID: property.value.id,
      url: property.value.map(p => p.listing.photos.map(u => { return u.url }))
    });
    property.photos.map(p => console.log(p.url));
    return res.json({ property: property, count: property.value.length })
  })
});

//get the property of specified date (e.g. 2016-05-04 )
app.get('/currentdatemodification', function (req, res) {
  request.get({
    url: 'https://stage.retsrabbit.com/api/v2/property?$filter=year(ModificationTimestamp) eq 2016 and month(ModificationTimestamp) eq 05 and day(ModificationTimestamp) eq 04',
    headers: {
      'Authorization': "Bearer " + token.access_token
    }, json: true
  }, function (err, response, body) {
    var newBody = body.value.map((value)=>{
      return {
        propertyID: value.listing.mls_id,
        lastModified: value.ModificationTimestamp,
        imageURI: value.listing.photos.map((photo)=>{
          return photo.url
        }),
        activestatus: value.listing.active,
        closePrice: value.closePrice,
        closeDate: value.closeDate
      }
    });

    Today.insertMany(newBody).then(function(result){
      res.json(newBody);
    }).catch( (err) =>{
      console.log("error")
    })
  })
});


//get the modified properties of today
app.get('/modifiedtoday', function (req, res) {
  var dateObj = new Date();
  var month = dateObj.getUTCMonth() + 1; //months from 1-12
  var day = dateObj.getUTCDate();
  var year = dateObj.getUTCFullYear();
  console.log(month, day, year)
  request.get({
    url: `https://stage.retsrabbit.com/api/v2/property?$filter=year(ModificationTimestamp) eq ${year} and month(ModificationTimestamp) eq ${month} and day(ModificationTimestamp) eq ${day}`,
    headers: {
      'Authorization': "Bearer " + token.access_token
    }, json: true
  }, function (err, response, body){
    var newBody = body.value.map((value)=>{
      return {
        propertyID: value.listing.mls_id,
        lastModified: value.ModificationTimestamp,
        imageURI: value.listing.photos.map((photo)=>{
          return photo.url
        }),
        activeStatus: value.listing.active,
        closePrice: value.closePrice,
        closeDate: value.closeDate
      }
    });
    Today.insertMany(newBody).then(function(result){
      res.json(newBody);
    }).catch( (err) =>{
      console.log("error")
    })
  })
});




// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});



// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});
app.listen(3000)
module.exports = app;
