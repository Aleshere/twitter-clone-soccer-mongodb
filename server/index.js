const express = require('express');
const cors = require('cors');
const monk = require('monk');
const Filter = require('bad-words');
const rateLimit = require('express-rate-limit');

const app = express();

const db = monk(process.env.MONGO_URI || 'localhost/meower');
const mews = db.get('Tweets');
const filter = new Filter();

app.enable('trust proxy');

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
    res.header('Access-Control-Allow-Origin', '*');
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

const createMew = (req, res, next) => {
    if (isValidMew(req.body)) {
      const mew = {
        name: filter.clean(req.body.name.toString().trim()),
        content: filter.clean(req.body.content.toString().trim()),
        created: new Date()
      };
  
      mews
        .insert(mew)
        .then(createdMew => {
          res.json(createdMew);
        }).catch(next);
    } else {
      res.status(422);
      res.json({
        message: 'Hey! Name and Content are required! Name cannot be longer than 50 characters. Content cannot be longer than 140 characters.'
      });
    }
  };
  
  app.post('/mews', createMew);
  
  app.use((error, req, res, next) => {
    res.status(500);
    res.json({
      message: error.message
    });
  });
  
  app.listen(db, () => {
    console.log('Listening on http://localhost:5000');
  });