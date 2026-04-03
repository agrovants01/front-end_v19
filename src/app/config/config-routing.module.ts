import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { UserDataComponent } from './user-data/user-data.component';
import { SidebarConfigComponent } from './sidebar-config/sidebar-config.component';
import { UserPasswordComponent } from './user-password/user-password.component';
import { UserEmailComponent } from './user-email/user-email.component';

const routes: Routes = [
  {
    path: 'user-data',
    component: UserDataComponent,
    children: [
      { path: '', component: SidebarConfigComponent },
    ]
  },
  {
    path: 'user-password',
    component: UserPasswordComponent,
    children: [
      { path: '', component: SidebarConfigComponent }
    ]
  },
  {
    path: 'user-email',
    component: UserEmailComponent,
    children: [
      { path: '', component: SidebarConfigComponent }
    ]
  },
  //TODO: Implement security
  { path: '', redirectTo: 'user-data', pathMatch: 'full' }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ConfigRoutingModule { }
