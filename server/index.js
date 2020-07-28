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

app.get('/mews', (req, res, next) => {
    // let skip = Number(req.query.skip) || 0;
    // let limit = Number(req.query.limit) || 10;
    let { skip = 0, limit = 5, sort = 'desc' } = req.query;
    skip = parseInt(skip) || 0;
    limit = parseInt(limit) || 5;

    Promise.all([
        mews
            .count(),
        mews
        .find({}, {
            skip,
            limit,
            sort: {
                created: sort === 'desc' ? -1 : 1
            }
        })
    ])

    .then(([ total, mews ]) => {
        res.json({
            mews,
            meta: {
                total,
                skip,
                limit,
                has_more: total - (skip + limit) > 0
            }
        });
    }).catch(next);
}); 

function isValidMew(mew) {
    return mew.name && mew.name.toString().trim() !== '' && mew.name.toString().trim().length <= 50
    && mew.content && mew.content.toString().trim() !== '' && mew.content.toString().trim().length <= 140;
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