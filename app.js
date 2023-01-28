const path = require('path');
const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const compression = require('compression');
const cors = require('cors');

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const bookingRouter = require('./routes/bookingRoutes');
const bookingController = require('./controllers/bookingController');
const viewRouter = require('./routes/viewRoutes');

// Start express app
const app = express();

app.enable('trust proxy');

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// 1) GLOBAL MIDDLEWARES
// Implement CORS
app.use(cors());
// Access-Control-Allow-Origin *
// api.natours.com, front-end natours.com
// app.use(cors({
//   origin: 'https://www.natours.com'
// }))

app.options('*', cors());
// app.options('/api/v1/tours/:id', cors());

// Serving static files
app.use(express.static(path.join(__dirname, 'public')));

// Set security HTTP headers
// app.use(helmet());
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      'default-src': ["'self'"],
      'connect-src': [
        "'self'",
        'ws://localhost:39281/',
        // 'ws://localhost:44159',
        // 'ws://localhost:39739/',
        // 'ws://localhost:39281/',
        'ws://localhost:42661/'

        // 'https://api.mapbox.com/styles/v1/vinronra/'
      ],
      'frame-src': ['https://js.stripe.com'],
      'script-src-elem': [
        "'self'",
        // 'https://api.mapbox.com/mapbox-gl-js/v0.54.0/mapbox-gl.js',
        'https://api.mapbox.com/mapbox-gl-js/v0.54.0/mapbox-gl.js',
        // 'https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-geocoder/v5.0.0/mapbox-gl-geocoder.min.js',
        'https://js.stripe.com/v3/'
      ],
      'worker-src': ["'self'", 'unsafe-inline', '* blob:'],
      'img-src': ["'self'", 'data:', 'blob:'],
      'style-src-elem': [
        "'self'",
        'data:',
        'https://fonts.googleapis.com',
        'https://api.mapbox.com/mapbox-gl-js/v0.54.0/mapbox-gl.css'
        // 'https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-geocoder/v5.0.0/mapbox-gl-geocoder.css'
      ],
      'script-src': [
        "'unsafe-inline'",
        "'self'",
        'https://api.mapbox.com/mapbox-gl-js/v0.54.0/mapbox-gl.js',
        'https://js.stripe.com/v3/'
      ],
      'object-src': ["'none'"]
    }
  })
);

// Development logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Limit requests from same API
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests from this IP, please try again in an hour!'
});
app.use('/api', limiter);

// Stripe webhook, BEFORE body-parser, because stripe needs the body as stream
app.post(
  '/webhook-checkout',
  bodyParser.raw({ type: 'application/json' }),
  bookingController.webhookCheckout
);

// Body parser, reading data from body into req.body
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// Prevent parameter pollution
app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsQuantity',
      'ratingsAverage',
      'maxGroupSize',
      'difficulty',
      'price'
    ]
  })
);

app.use(compression());

// Test middleware
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  // console.log(req.cookies);
  next();
});

// 3) ROUTES
app.use('/', viewRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRouter);

app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);

module.exports = app;
// Different names on db and codebase--- pic not found
