const express = require('express');
const exphbs = require('express-handlebars');
const bodyParser = require('body-parser');
const Handlebars = require('handlebars');
const { allowInsecurePrototypeAccess } = require('@handlebars/allow-prototype-access');
const mongoose = require('mongoose');
const passport = require('passport');
const https = require("https");
const cookieParser = require('cookie-parser');
const session = require('express-session');
const flash = require('connect-flash');
const bcrypt = require('bcryptjs');
const formidable = require('formidable');
const ejs = require("ejs");
// load models
const Message = require('./models/message.js');
const User = require('./models/user');
const app = express();
//load keys file
const keys = require('./config/keys.js');
//load helpers
const {requireLogin,ensureGuest} = require('./helpers/auth');
const {uploadImage} = require('./helpers/aws');
// use body parser middleware
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
//configuration for authentication
app.use(cookieParser());
app.use(session({
    secret: 'mysecret',
    resave: true,
    saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
app.use(function(req,res,next){
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error');
    next();
});
//setup express static folder to serve js, css files
app.use(express.static('public'));
//make user glober object
app.use(function(req,res,next){
    res.locals.user = req.user || null;
    next();
});

require('./passport/local');
// connect to mlab mongodb
mongoose.connect(keys.MongoDB, {useNewUrlParser:true, useUnifiedTopology: true}).then(function(){
    console.log('Server is connected to MongoDB');    
}).catch(function(err){
    console.log(err);    
});

app.engine('handlebars',exphbs({
    defaultLayout:'main',
    handlebars: allowInsecurePrototypeAccess(Handlebars)
}));
app.set('view engine','handlebars');

// app.set('view engine', 'ejs');


app.get('/',function(req,res){
    res.render('home');
});

app.get('/about-us',function(req,res){
    res.render('about-us');
});

app.get('/contact-us',function(req,res){
    res.render('contact-us');
});

app.get('/account-holder-information',function(req,res){
    res.render('account-holder-information');
});

app.get('/customer-account-application',function(req,res){
    res.render('customer-account-application');
});

app.get("/innerndinye",function(req,res){
    res.render("innerndinye");
});

app.get('/login',function(req,res){
    res.render('login');
});

app.get('/profile',requireLogin,function(req,res){
    User.findById({_id:req.user._id}).then(function(user){
        if (user){
            user.online= true;
            user.save(function(err,user){
                if (err){
                    throw err;
                } else{
                    res.render('profile',{
                        title: 'profile',
                        user:user
                    });
                }
            })
        }
    });
});

app.get('/newAccount', function(req,res){
    res.render('newAccount',{
        title: 'Signup'
    });
});


app.post('/signup',function(req,res){
    console.log(req.body); 
    let errors = [];
    
    if (req.body.password !== req.body.password2){
        errors.push({text: 'Password does Not match'});
    }
    if (req.body.password.length < 5){
        errors.push({text: 'Password must beatleast 5 characters'});
    }
    if (errors.length > 0){
        res.render('newAccount',{
            errors: errors,
            title: 'Error',
            fullname: req.body.username,
            email: req.body.email,
            accountNumber: req.body.accountNumber,
            accountBalance: req.body.accountBalance,
            dateAndTime: req.body.dateAndTime,
            password: req.body.password,
            password2: req.body.password2
        });
    }else{
        User.findOne({email:req.body.email})
        .then(function(user){
            if (user) {
                let errors = [];
                errors.push({text:'Email already exist'});
                res.render('newAccount',{
                    title: 'Signup',
                    errors:errors
                })
            }else{
                var salt = bcrypt.genSaltSync(10);
                var hash = bcrypt.hashSync(req.body.password, salt);
                const newUser = {
                    fullname: req.body.username,
                    email: req.body.email,
                    address: req.body.address,
                    accountNumber: req.body.accountNumber,
                    accountBalance: req.body.accountBalance,
                    dateAndTime: req.body.dateAndTime,
                    parentsAddress: req.body.parentsAddress,
                    country: req.body.country,
                    phoneNumber: req.body.phoneNumber,
                    password: hash
                }
                // console.log(newUser);  
                new User(newUser).save(function(err, user){
                    if (err){
                        throw err;
                    }
                    if (user){
                        let success = [];
                        success.push({text: 'You have successfully created an account, you can login now'});
                        res.render('home',{
                            success: success
                        });
                    }
                })             
            }
        });
    }


});

app.post('/login',passport.authenticate('local',{
    successRedirect:'/profile',
    failureRedirect:'/loginErrors'
}));
app.get('/loginErrors',function(req,res){
    let errors = [];
    errors.push({text:'User Not Found or Password is Incorrect'});
    res.render('home',{
        errors:errors
    });
});
// handle get route

app.get('/logout', function(req,res){
    User.findById({_id:req.user._id})
    .then(function(user){
        user.online= false;
        user.save(function(err,user){
            if (err){
                throw err;
            }
            if (user){
                req.logout();
                res.redirect('/');
            }
        })
    })
   
})

app.post('/contactUs',function(req,res){
    console.log(req.body);
    //res.send('thanks');
    const newMessage = {
        fullname: req.body.fullname,
        email: req.body.email,
        message: req.body.message,
        date: new Date()
    }
    

    new Message(newMessage).save(function(err, message){
        if (err){
            throw err;
        }else{
            Message.find({})
            .then(function(messages){
                if(messages){                    
                    res.render('newmessage',{
                        title: 'Sent',
                        messages:messages
                    });
                }else{
                    res.render('noMessage',{
                        title: 'Not found'
                    });
                }
            });
        }
        
    });
    
});




app.post("/customer-contact-information",function(req,res){
    res.render("new-customers-account");
  });

app.listen(process.env.PORT || 3000, function() {
    console.log('Server is running on Port 3000');
});