import Omise from 'omise';

if (!process.env.OMISE_SECRET_KEY) {
  throw new Error('OMISE_SECRET_KEY is not set');
}

export const omiseClient = Omise({
  secretKey: process.env.OMISE_SECRET_KEY,
  omiseVersion: '2019-05-29',
});
