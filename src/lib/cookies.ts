import { Response } from 'express';

export function setCookie(res: Response, name: string, value: string) {
  res.cookie(name, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/'
  });
}

// Non-httpOnly marker cookie the front-end reads (lib/auth.ts) to know a
// session is active, since it cannot read the httpOnly access_token itself.
export function setLoggedInCookie(res: Response) {
  res.cookie('logged_in', 'true', {
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/'
  });
}
