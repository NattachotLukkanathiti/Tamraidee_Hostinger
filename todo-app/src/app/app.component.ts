import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterOutlet, RouterLink, Router } from '@angular/router'; // <-- เพิ่ม Router ตรงนี้

import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';

import { TodoService, Todo } from './services/todo.service';
import { NavbarComponent } from './navbar/navbar.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatInputModule,
    MatButtonModule,
    MatCheckboxModule,
    MatIconModule,
    RouterOutlet,
    NavbarComponent 

  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {

  private todoService = inject(TodoService);
  private router = inject(Router); // <-- ย้ายขึ้นมาไว้ด้านบนเพื่อให้เป็นระเบียบ

  username = '';
  title = '';
  password = '';
  confirmPassword = '';
  rememberMe = false;

  todos: Todo[] = [];

  ngOnInit(): void {
    this.loadTodos();
  }

  loadTodos() {
    this.todoService.getTodos().subscribe(data => {
      this.todos = data;
    });
  }

  addTodo() {
    if (!this.title.trim()) return;

    this.todoService.addTodo(this.username, this.title, this.password, this.confirmPassword).subscribe(() => {
      this.username = '';
      this.title = '';
      this.password = '';
      this.confirmPassword = '';
      this.loadTodos();
    });
  }

  deleteTodo(id: number) {
    this.todoService.deleteTodo(id).subscribe(() => {
      this.loadTodos();
    });
  }

  toggleTodo(todo: Todo) {
    this.todoService.updateTodo(todo).subscribe(() => {
      this.loadTodos();
    });
  }

  isLoginPage(): boolean {
  const hiddenRoutes = ['/', '/register', '/otp', '/forgot', '/pos', '/login', '/confirmemployee','/receipt','/step'];
  
  // ใช้ .split('?')[0] เพื่อตัด Query Parameters (เช่น ?fbclid=...) ออกไป
  const currentRoute = this.router.url.split('?')[0];
  
  return hiddenRoutes.includes(currentRoute);
}
}