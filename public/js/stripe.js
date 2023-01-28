/* eslint-disable */
import axios from 'axios';
import { showAlert } from './alerts';
const stripe = Stripe(
  'pk_test_51M1RUmSEHg85zQoI2up5MWZPdEmgkHgmlQL9GWTfaPJUrTsqGvTdcDKDQ4VTH8bw5sm4e4mXXVc6deVFxB5j7cdK00YDazA2wD'
);

export const bookTour = async tourId => {
  try {
    // 1) Get checkout session from API
    const session = await axios(`/api/v1/bookings/checkout-session/${tourId}`);
    console.log(session);

    // 2) Create checkout form + chanre credit card
    await stripe.redirectToCheckout({
      sessionId: session.data.session.id
    });
  } catch (err) {
    // console.log(err);
    showAlert('error', err);
  }
};
