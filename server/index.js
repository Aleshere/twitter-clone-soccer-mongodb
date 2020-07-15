const express = require('express');
const cors = require('cors');
const monk = require('monk');
const Filter = require('bad-words');
const rateLimit = require('express-rate-limit');

const app = express();

const db = monk(process.env.MONGO_URI || 'localhost/meower');
const mews = db.get('mews');
const filter = new Filter();


app.use(cors());
app.use(express.json());


app.get('/', (req, res) => {
    res.json({
        message: 'Tweeter!'
    });
});

app.get('/mews', (req, res) => {
    mews.find().then(mews => {
        res.json(mews)
    });
}); 

function isValidMew(mew) {
    return mew.name && mew.name.toString().trim() !== '' && mew.content && mew.content.toString().trim() !== '';
}

app.use(rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5 // limit each IP to 100 requests per windowMs
}));

app.post('/mews', (req, res) => {
    if (isValidMew(req.body)) {
        // insert into db
        const mew = {
            name: filter.clean(req.body.name.toString()),
            content: filter.clean(req.body.content.toString()),
            created: new Date()
        };

        mews.insert(mew).then(createdMew => {
            res.json(createdMew);
        })
        
    } else {
        res.status(422);
        res.json({
            message: 'Hey! Name and Content are Required!'
        });
    }
});


app.listen(5000, () => {
    console.log('Listening on http://localhost:5000');
    
});