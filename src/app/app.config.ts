// src/app/app.config.ts

import { ApplicationConfig }        from '@angular/core';
import { provideRouter }             from '@angular/router';
import { provideHttpClient,
         withInterceptors }          from '@angular/common/http';
import { provideAnimations }         from '@angular/platform-browser/animations';

import { APP_ROUTES }                from './app.routes';
import { jwtInterceptor }           from './core/interceptors/jwt.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(APP_ROUTES),
    provideHttpClient(
      withInterceptors([jwtInterceptor])  // attaches JWT to every request
    ),
    provideAnimations()
  ]
};