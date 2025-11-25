import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { StorageService } from '../../services/storage.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  pwd = '';

  // Cette propriété remplace localStorage dans le HTML
  get isFirstTime(): boolean {
    return !localStorage.getItem('master_password_v2');
  }

  constructor(
    private auth: AuthService,
    private storage: StorageService,
    private router: Router
  ) {}

  async login() {
    if (this.isFirstTime) {
      if (this.pwd.length >= 4) {
        this.auth.setPassword(this.pwd);
        this.auth.login();
        await this.storage.init(this.pwd);
        this.router.navigate(['/dashboard']);
      } else {
        alert('Mot de passe trop court ! Minimum 4 caractères');
      }
    } else {
      if (this.auth.checkPassword(this.pwd)) {
        this.auth.login();
        await this.storage.init(this.pwd);
        this.router.navigate(['/dashboard']);
      } else {
        alert('Mot de passe incorrect !');
      }
    }
  }
}