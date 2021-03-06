const passport = require('passport');
const router = require('express').Router();
const { getMajors, getClassID, getClassName } = require('../course_json_parser');
const { addUser, updateUser, deleteUser, findUser, addReview, addClass, addTutor, Classes, deleteTutor } = require('../mongoose');

// A route used when a user wants to log in
router.get('/login', passport.authenticate('googleHave', {
    scope: ['profile', 'email'],
    hd: 'ucsc.edu'
}));

// A route used when a user wants to sign up via Google authentication
router.get('/signup', passport.authenticate('googleSignUp', {
    scope: ['profile', 'email'],
    hd: 'ucsc.edu'
}));

// A route used when a user creates an account
router.get('/create', function(req, res) {
    res.render('createAccount', {
        user: req.user,
        majors: getMajors(),
        formTitle: 'Profile Information'
    });
});

// A route used to access a user's profile
// eslint-disable-next-line no-useless-escape
router.get('/user/:id(\\d+)', (req, res) => {
    let googleID = req.params.id;
    findUser(googleID)
        .then(prof => {
            if (!prof) {
                throw new Error('No such Profile!');
            }
            let courses = prof.coursesTeaching.map(course => ({
                _id: course._id,
                courseName: getClassName(course._id),
                rating: course.rating,
                reviewCount: course.reviewCount
            }));
            res.render('profileView-guest', { profile: prof, courses, loggedIn: req.isAuthenticated(), thisUser: req.user });
        }).catch((err) => {
            throw err;
        });
});

// A route used when a user logs out
router.get('/logout', function(req, res) {
    req.logout();
    res.redirect(req.header('Referer') || '/');
});

/**
 * Every route past this requires the user to be logged in!
 */
router.use((req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/profile/login');
});


//A route used when a user accesses their profile
router.get('/', function(req, res) {
    let courseNames = req.user.coursesTeaching.map(course => ({
        courseName: getClassName(course._id)
    }));

    res.render('profileView-user', {
        loggedIn: req.isAuthenticated(),
        profile: req.user,
        courses: courseNames,
        majors: getMajors()
    });
});

// A route that accesses a user's review page for a particular class
router.get('/user/:id(\\d+)/review/:course(\\d+)', (req, res) => {
    let googleID = req.params.id;
    let classID = req.params.course;
    findUser(googleID)
        .then(prof => {
            if (!prof) {
                throw new Error('No such Profile!');
            }

            let className = getClassName(classID);
            res.render('review', { profile: prof, classID, className, loggedIn: req.isAuthenticated() });
        }).catch((err) => {
            throw err;
        });
});

// A route that submits a user's review
router.post('/user/:id(\\d+)/review/:course(\\d+)/sub', (req, res) => {
    let googleID = req.params.id;
    let classID = req.params.course;
    let reviews = req.body; // Will contain an object with each reviewed category ~ object's fields will depend on how its sent from the client

    addReview(googleID, classID, reviews)
        .then(() => {
            console.log('reviewed');
            req.session.reviewed = true;
            req.session.save(() => res.json({ success: true }));
        }).catch((err) => {
            throw err;
        });
});

// A route that will actually create a user's account within the database
router.post('/createProfile', function(req, res) {
    let profile = newProfile(req.body, req.user.id, req.user.extra);
    addUser(profile)
        .then(profile => {
            req.login({ id: profile.googleID }, err => {
                if (err) return res.redirect('/');
                res.redirect('/');
            });

            for (var i = 0; i < profile.coursesTeaching.length; i++) {
                let thisClassID = profile.coursesTeaching[i]._id;
                Classes.findById(thisClassID)
                    .then(thisClass => {
                        // May even addTutor without class existing
                        if (thisClass == null) {
                            addClass(thisClassID)
                                .then(() => addTutor(thisClassID, profile.googleID))
                                .catch(err => console.log(err));
                        } else {
                            addTutor(thisClassID, profile.googleID)
                                .catch(err => console.log(err));
                        }
                    });
            }
        })
        .catch(err => console.log(err));
});

// A route used when a user wants to update their profile
router.post('/updateProfile', function(req, res) {
    if (Object.keys(req.body).length < 1) {
        return res.json({ successful: true });
    }
    updateUser(req.user, req.body)
        .then(() => res.json({ sucessful: true }))
        .catch(() => res.json({ sucessful: false }));

    var updatingClass = req.body;
    if (updatingClass.coursesTeaching != null) {
        for (var i = 0; i < updatingClass.coursesTeaching.length; i++) {
            if (updatingClass.coursesTeaching[i].includes('-')) {
                let course = updatingClass.coursesTeaching[i];
                let courseName = course.substring(1);
                deleteTutor(req.user.googleID, getClassID(courseName))
                    .catch(err => console.log(err));
            } else {
                let course = updatingClass.coursesTeaching[i];
                let courseID = getClassID(course);
                Classes.findById(courseID)
                    .then(thisClass => {
                        if (thisClass == null) {
                            addClass(courseID)
                                .then(() => addTutor(courseID, req.user))
                                .catch(err => console.log(err));
                        } else {
                            addTutor(courseID, req.user);
                        }
                    });
            }
        }
    }
});

// A route used when a user wants to delete their profile
router.get('/deleteProfile', (req, res) => {
    var deletingClass = req.user;
    for (var i = 0; i < deletingClass.coursesTeaching.length; i++) {
        let delCourse = deletingClass.coursesTeaching[i]._id;
        deleteTutor(req.user.googleID, delCourse)
            .catch(err => console.log(err));
    }
    deleteUser(req.user.id)
        .then(() => {
            req.session.passport = null;
            req.session.deleted = true;
            req.session.save(() => res.redirect('/'));
        })
        .catch(() => {
            throw new Error('There was a problem with deleting the acct.');
        });
});


function newProfile (body, googleID, extra) {
    return {
        firstName: body.firstName,
        lastName: body.lastName,
        year: body.year,
        college: body.college,
        major: body.major,
        bio: body.bio,
        linkedIn: body.linkedIn,
        coursesTeaching: body.coursesTeaching.map(course => ({ courseNo: getClassID(course), rating: 5 })),
        googleID,
        email: extra.email
    };
}

module.exports = router;