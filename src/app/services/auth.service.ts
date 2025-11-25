import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly KEY = 'master_password_v2';
  private readonly AUTH = 'is_logged_in';

  setPassword(pwd: string) {
    localStorage.setItem(this.KEY, btoa(pwd));
  }

  checkPassword(pwd: string): boolean {
    const saved = localStorage.getItem(this.KEY);
    if (!saved) return pwd.length >= 4;
    return btoa(pwd) === saved;
  }

  login() { localStorage.setItem(this.AUTH, 'true'); }
  logout() { localStorage.removeItem(this.AUTH); }
  isAuthenticated() { return localStorage.getItem(this.AUTH) === 'true'; }
}