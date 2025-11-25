import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StorageService, MyFile, Folder } from '../../services/storage.service';
import { SyncService } from '../../services/sync.service';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  files: MyFile[] = [];
  folders: Folder[] = [];
  currentFolder: string | null = null;
  searchTerm = '';
  qrCodeUrl = '';
  shareLink = '';
  previewFile: MyFile | null = null;
  previewUrl: string | null = null;

  constructor(
    private storage: StorageService,
    private sync: SyncService,
    private auth: AuthService,
    private router: Router
  ) {}

  async ngOnInit() {
    const pwd = prompt('Re-confirme ton mot de passe maître pour déchiffrer tes fichiers :');
    if (!pwd) return this.router.navigate(['/login']);
    await this.storage.init(pwd);
    this.loadData();
  }

  async loadData() {
    this.files = await this.storage.getAllFiles();
    this.folders = await this.storage.getFolders();
  }

  // Upload
  async onFilesSelected(event: any) {
    const files = event.target.files;
    for (const file of files) {
      await this.storage.addFile(file, this.currentFolder || undefined);
    }
    this.loadData();
  }

  // Dossiers
  async createFolder() {
    const name = prompt('Nom du dossier ?');
    if (name) {
      await this.storage.createFolder(name);
      this.loadData();
    }
  }

  openFolder(id: string) { this.currentFolder = id; }
  back() { this.currentFolder = null; }

  // Fichiers
  async preview(file: MyFile) {
    this.previewFile = file;
    const blob = await this.storage.getFileBlob(file);
    this.previewUrl = URL.createObjectURL(blob);
  }

  async deleteFile(id?: number) {
    if (id && confirm('Supprimer définitivement ?')) {
      await this.storage.deleteFile(id);
      this.loadData();
    }
  }

  // QR Sync
  async generateQR() {
    const pwd = prompt('Mot de passe pour la synchronisation ?');
    if (pwd) this.qrCodeUrl = await this.sync.generateQR(pwd);
  }

  // Partage
  async shareFile(file: MyFile) {
    const pwd = prompt('Mot de passe pour le partage ?');
    if (pwd) {
      const blob = await this.storage.getFileBlob(file);
      const url = URL.createObjectURL(blob);
      this.shareLink = `${file.name} → Lien temporaire : ${url} (valide 5 min)`;
      setTimeout(() => URL.revokeObjectURL(url), 5 * 60 * 1000);
    }
  }

  // Utilitaires
  getCurrentFiles() {
    if (!this.currentFolder) return this.files.filter(f => !f.folderId);
    return this.files.filter(f => f.folderId === this.currentFolder);
  }

  getFilteredFiles() {
    return this.getCurrentFiles().filter(f =>
      f.name.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
  }

  formatSize(bytes: number) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}