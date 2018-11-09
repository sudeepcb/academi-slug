const mongoose = require('mongoose');
mongoose.set('useFindAndModify', false); //Avoid deprecation warning
mongoose.connect('mongodb://jrybojad:exchangeslug3@ds135003.mlab.com:35003/academi-slug', {
    useNewUrlParser: true
});

const connection = mongoose.connection;
connection.once('open', function() {
    console.log('We\'re connected to the database!');
});
// connection.dropDatabase();

let classTutorSchema = new mongoose.Schema({
    _id: {
        type: Number,
        required: true,
        unique: true,
        alias: 'googleID'
    },
    name: {
        type: String,
        required: true
    },
    rating: {
        type: Number,
        required: true
    },
}, {
    autoIndex: false,
    versionKey: false,
    _id: false
});

let classSchema = new mongoose.Schema({
    _id: {
        type: Number,
        required: true,
        unique: true,
        alias: 'courseNo'
    },
    tutors: [classTutorSchema]
}, {
    autoIndex: false,
    versionKey: false,
    _id: false
});


let Classes = mongoose.model('Classes', classSchema);

let courseTeachingSchema = new mongoose.Schema({
    _id: {
        type: Number,
        required: true,
    },
    rating: {
        type: Number,
        required: true,
        Default: 5
    },
}, {
    autoIndex: false,
    versionKey: false,
    _id: false
});

courseTeachingSchema.virtual('courseNo')
    .get(function() {
        return this._id;
    })
    .set(function(val) {
        this._id = val;
    });


let userSchema = new mongoose.Schema({
    _id: {
        type: Number,
        required: true,
        unique: true,
        alias: 'googleID'
    },
    email: {
        type: String,
        required: true
    },
    name: {
        first: {
            type: String,
            required: true,
            alias: 'firstName'
        },
        last: {
            type: String,
            required: true,
            alias: 'lastName'
        },
        _id: {
            id: false
        }
    },
    year: {
        type: String,
        required: true
    },
    college: {
        type: String,
        required: true
    },
    major: {
        type: String,
        required: true
    },
    bio: {
        type: String,
        required: true
    },
    linkedIn: {
        type: String,
        required: true
    },
    coursesTeaching: [courseTeachingSchema]
}, {
    autoIndex: false,
    versionKey: false,
    _id: false
});

userSchema.virtual('fullName').get(function() {
    return this.firstName + ' ' + this.lastName;
});


let Users = mongoose.model('Users', userSchema);

function addUser (user) {
    return new Promise((resolve, reject) => {
        let userAdded = new Users({
            googleID: user.googleID,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            year: user.year,
            college: user.college,
            major: user.major,
            bio: user.bio,
            coursesTeaching: user.coursesTeaching,
            linkedIn: user.linkedIn

        });
        userAdded.save((err, profile) => {
            if (err) {
                return reject(err);
            }
            // console.log(profile);
            console.log('User ' + profile.googleID + ' added.');
            resolve(profile);
        });
    });
}

//Uncomment to test
//UpdateUser works on Reviews, but overrides reviews.
// deleteUser(24245)
//     .then(() => addUser({ googleID: 24245, email: 'sammyslub@ucsc.edu', firstName: 'Sammy', lastName: 'Slug', year: 'Junior', college: 'Nine', major: 'CS', bio: 'Banana Slug', coursesTaught: [{ courseNo: 420, rating: 4 }, { courseNo: 567, rating: 2}] }))
//     .then(prof => findUser(prof.googleID))
//     .then(prof => {
//         console.log(`BEFORE: ${prof.fullName}`);
//         return prof;
//     })
//     .then((prof) => updateUser(prof.googleID, { 'name.first': 'Bob' }))
//     .then((prof) => addReview(prof.googleID, { 'coursesTaught': [{courseNo:  420, rating: 4.6}] }))
//     .then(prof => console.log(`AFTER: ${prof.fullName}`))
//     .then(prof => console.log(`AFTER: ${prof.coursesTaught[0]}`))
//     .catch(err => console.log(err));

function deleteUser (googleID) {
    return new Promise((resolve, reject) => {
        Users.findByIdAndDelete(googleID, function(err) {
            if (err) {
                console.log('User with googleID ' + googleID + ' does not exist.');
                return reject(err);
            }
            console.log('User ' + googleID + ' deleted.');
            resolve();
        });
    });
}

function findUser (googleID) {
    console.log('Searching for User ' + googleID);
    return new Promise((resolve, reject) => {
        Users.findById(googleID)
            .exec((err, profile) => {
                if (err) {
                    return reject(err);
                }
                resolve(profile);
            });
    });
}

function updateUser (googleID, userEdits) {
    console.log('Updating user ' + googleID);
    return new Promise((resolve, reject) => {
        Users.findByIdAndUpdate(googleID, userEdits, { new: true })
            .exec((err, user) => {
                if (err) return reject(err);
                resolve(user);
            });
    });
}

//Untested - needed
function addReview (googleID, courseNo, average) {
    console.log('Adding a review!');
    return new Promise((resolve, reject) => {
        Users.update({ 'googleID': googleID, 'courseNo': courseNo }, {
                $set: { 'courseNo.$.rating': average }
            })
            .exec((err, user) => {
                if (err) return reject(err);
                resolve(user);
            });
    });
}


/**
 * func should add tutor under class but if class is not in database
 * add class to db with tutor under it
 */

//Works
function addClass (course) {
    return new Promise((resolve, reject) => {
        let classAdded = new Classes({ courseNo: course.courseNo });
        classAdded.save((err, course) => {
            if (err) {
                return reject(err);
            }
            console.log('Class ' + course.courseNo + ' added.');
            resolve(course);
        });
    });
}

//Seems to be working
function addTutor (googleID, courseNo) {
    console.log('I am adding a tutor to a class!');
    // Some function to instantiate tutor(googleID)
    return new Promise((resolve, reject) => {
        //     UserClassess.update({ 'courseNo': courseNo }, { $set: { 'tutors.$._id': googleID } })
        //         .exec((err, user) => {
        //             if (err) return reject(err);
        //             resolve(user);
        //         })
        // })

        Classes.findByIdAndUpdate(courseNo, { $addToSet: { tutors: { googleID } } })
            .exec((err, user) => {
                if (err) return reject(err);
                console.log('Tutor ' + googleID + ' added to class ' + courseNo);
            });
    });
}

//Untested
function deleteTutor (googleID, courseNo) {
    return new Promise((resolve, reject) => {
        Classes.findByIdAndDelete(googleID, function(err) {
            if (err) {
                console.log('User with googleID ' + googleID + ' does not exist.');
                return reject(err);
            }
            console.log('User ' + googleID + ' deleted.');
            resolve();
        });
    });
}

//Untested
function findClass (courseNo) {
    console.log('Searching for Class ' + courseNo);
    return new Promise((resolve, reject) => {
        Classes.findById(courseNo)
            .exec((err, classQuery) => {
                if (err) {
                    return reject(err);
                }
                resolve(classQuery);
            });
    });
}

module.exports = {
    addUser,
    deleteUser,
    findUser,
    updateUser,
    addClass,
    addTutor,
    findClass,
    connection
};