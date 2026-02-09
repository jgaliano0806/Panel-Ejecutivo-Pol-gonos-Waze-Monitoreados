import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { ApiService, Polygon } from '../../core/services';
import { ModernHeaderComponent } from '../../shared/components/modern-header/modern-header.component';
import { ModalComponent } from '../../shared/components/modal/modal.component';

type AdminSection = 'polygons' | 'catalogs' | 'users' | 'sso' | 'settings' | 'reports';

interface AdminMenuItem {
  id: AdminSection;
  label: string;
  icon: string;
  description: string;
  gradient: string;
}

interface CatalogType {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  isActive: boolean;
}

interface CatalogSubtype {
  id: string;
  typeId: string;
  code: string;
  name: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  isActive: boolean;
}

interface PolygonForm {
  id: string;
  name: string;
  group: string;
  feedUrl: string;
  centerLat: number | null;
  centerLng: number | null;
  geometry: string;
}

interface TypeForm {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  isActive: boolean;
}

interface SubtypeForm {
  id: string;
  code: string;
  name: string;
  typeId: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  isActive: boolean;
}

interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  role: string;
  polygons: string[];
  isActive: boolean;
  lastLogin?: string;
}

interface UserForm {
  id: string;
  name: string;
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: string;
  polygons: string[];
  isActive: boolean;
}

interface Role {
  id: string;
  name: string;
  description: string;
  color: string;
  permissions: string[];
  isSystem: boolean;
}

interface RoleForm {
  id: string;
  name: string;
  description: string;
  color: string;
  permissions: string[];
}

interface Permission {
  id: string;
  label: string;
}

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NgIcon,
    ModernHeaderComponent,
    ModalComponent,
  ],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 via-green-50/20 to-yellow-50/30 dark:from-veltrix-bg dark:via-[#1e2330] dark:to-veltrix-bg">
      <!-- Header -->
      <app-modern-header />

      <!-- Main Content -->
      <div class="max-w-[1900px] mx-auto px-8 py-8">
        <div class="grid grid-cols-12 gap-6">
          <!-- Sidebar -->
          <div class="col-span-3">
            <div class="sticky top-8 space-y-2">
              @for (item of menuItems; track item.id) {
                <button
                  (click)="activeSection.set(item.id)"
                  class="w-full p-4 rounded-xl text-left transition-all border"
                  [class]="activeSection() === item.id
                    ? 'bg-gradient-to-r ' + item.gradient + ' text-white shadow-lg border-transparent'
                    : 'bg-veltrix-card hover:bg-veltrix-bg border-veltrix-border'"
                >
                  <div class="flex items-center gap-3">
                    <ng-icon [name]="item.icon" size="20" />
                    <div class="flex-1">
                      <div class="font-medium">{{ item.label }}</div>
                      <div class="text-xs" [class]="activeSection() === item.id ? 'text-white/70' : 'text-veltrix-muted'">
                        {{ item.description }}
                      </div>
                    </div>
                    <ng-icon name="lucideChevronRight" size="16"
                             [class]="activeSection() === item.id ? 'rotate-90' : ''"
                             class="transition-transform" />
                  </div>
                </button>
              }
            </div>
          </div>

          <!-- Content Area -->
          <div class="col-span-9">
            <div class="bg-veltrix-card rounded-2xl shadow-lg border border-veltrix-border min-h-[600px]">
              <!-- Polygons Section -->
              @if (activeSection() === 'polygons') {
                <div class="p-6">
                  <div class="flex items-center justify-between mb-6">
                    <div>
                      <h2 class="text-xl font-bold text-veltrix-text">Gestión de Polígonos Waze</h2>
                      <p class="text-sm text-veltrix-muted">Administración de feeds y áreas monitoreadas</p>
                    </div>
                    <button
                      (click)="openPolygonModal()"
                      class="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <ng-icon name="lucidePlus" size="16" />
                      <span>Nuevo Polígono</span>
                    </button>
                  </div>

                  <div class="overflow-x-auto">
                    <table class="data-table w-full">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Nombre</th>
                          <th>Grupo</th>
                          <th>Feed URL</th>
                          <th>Centro</th>
                          <th>Estado</th>
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        @for (polygon of polygons(); track polygon.id) {
                          <tr>
                            <td class="font-mono text-xs">{{ polygon.id }}</td>
                            <td class="font-medium text-veltrix-text">{{ polygon.name }}</td>
                            <td>
                              <span class="px-2 py-1 bg-veltrix-bg rounded text-xs text-veltrix-muted">
                                {{ polygon.group || 'Sin grupo' }}
                              </span>
                            </td>
                            <td>
                              <span class="text-xs text-blue-500 truncate max-w-[200px] block">
                                {{ polygon.feedUrl || 'N/A' }}
                              </span>
                            </td>
                            <td class="text-xs text-veltrix-muted font-mono">
                              {{ polygon.center ? polygon.center.lat.toFixed(4) + ', ' + polygon.center.lng.toFixed(4) : 'N/A' }}
                            </td>
                            <td>
                              <span class="px-2 py-1 rounded text-xs font-medium"
                                    [class]="polygon.state === 'low' ? 'bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400' :
                                             polygon.state === 'medium' ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400' :
                                             'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400'">
                                {{ polygon.state?.toUpperCase() || 'N/A' }}
                              </span>
                            </td>
                            <td>
                              <div class="flex items-center gap-1">
                                <button
                                  (click)="editPolygon(polygon)"
                                  class="p-1.5 hover:bg-veltrix-bg rounded transition-colors text-veltrix-muted hover:text-blue-500"
                                  title="Ver/Editar"
                                >
                                  <ng-icon name="lucideEye" size="14" />
                                </button>
                                <button
                                  (click)="editPolygon(polygon)"
                                  class="p-1.5 hover:bg-veltrix-bg rounded transition-colors text-veltrix-muted hover:text-yellow-500"
                                  title="Configurar"
                                >
                                  <ng-icon name="lucideSettings" size="14" />
                                </button>
                                <button
                                  (click)="deletePolygon(polygon)"
                                  class="p-1.5 hover:bg-veltrix-bg rounded transition-colors text-veltrix-muted hover:text-red-500"
                                  title="Eliminar"
                                >
                                  <ng-icon name="lucideTrash2" size="14" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        } @empty {
                          <tr>
                            <td colspan="7" class="text-center py-12 text-veltrix-muted">
                              No hay polígonos configurados
                            </td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                </div>
              }

              <!-- Catalogs Section -->
              @if (activeSection() === 'catalogs') {
                <div class="p-6">
                  <div class="flex items-center justify-between mb-6">
                    <div>
                      <h2 class="text-xl font-bold text-veltrix-text">Gestión de Catálogos</h2>
                      <p class="text-sm text-veltrix-muted">Tipos y subtipos de incidentes</p>
                    </div>
                    <div class="flex items-center gap-2">
                      <button
                        (click)="syncCatalogs()"
                        class="flex items-center gap-2 px-4 py-2 bg-veltrix-bg border border-veltrix-border rounded-lg hover:bg-veltrix-card transition-colors text-veltrix-text"
                      >
                        <ng-icon name="lucideRefreshCw" size="16" />
                        <span>Sincronizar Waze</span>
                      </button>
                      <button
                        (click)="openTypeModal()"
                        class="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <ng-icon name="lucidePlus" size="16" />
                        <span>Nuevo Tipo</span>
                      </button>
                    </div>
                  </div>

                  <!-- Tabs -->
                  <div class="flex gap-2 mb-6">
                    <button
                      (click)="catalogTab.set('types')"
                      class="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                      [class]="catalogTab() === 'types' ? 'bg-green-600 text-white' : 'bg-veltrix-bg text-veltrix-muted hover:text-veltrix-text'">
                      Tipos de Incidentes
                    </button>
                    <button
                      (click)="catalogTab.set('subtypes')"
                      class="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                      [class]="catalogTab() === 'subtypes' ? 'bg-green-600 text-white' : 'bg-veltrix-bg text-veltrix-muted hover:text-veltrix-text'">
                      Subtipos
                    </button>
                  </div>

                  <!-- Types Table -->
                  @if (catalogTab() === 'types') {
                    <div class="overflow-x-auto">
                      <table class="data-table w-full">
                        <thead>
                          <tr>
                            <th>Código</th>
                            <th>Nombre</th>
                            <th>Icono</th>
                            <th>Color</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          @for (type of catalogTypes(); track type.id) {
                            <tr>
                              <td class="font-mono text-xs">{{ type.code }}</td>
                              <td class="font-medium text-veltrix-text">{{ type.name }}</td>
                              <td>
                                <div class="w-8 h-8 rounded-lg flex items-center justify-center"
                                     [style.background-color]="type.color + '20'">
                                  <ng-icon [name]="getTypeIcon(type.icon)" [style.color]="type.color" size="16" />
                                </div>
                              </td>
                              <td>
                                <div class="flex items-center gap-2">
                                  <span class="w-4 h-4 rounded" [style.background-color]="type.color"></span>
                                  <span class="text-xs font-mono text-veltrix-muted">{{ type.color }}</span>
                                </div>
                              </td>
                              <td>
                                <span class="px-2 py-1 rounded text-xs font-medium"
                                      [class]="type.isActive ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'">
                                  {{ type.isActive ? 'Activo' : 'Inactivo' }}
                                </span>
                              </td>
                              <td>
                                <div class="flex items-center gap-1">
                                  <button
                                    (click)="editType(type)"
                                    class="p-1.5 hover:bg-veltrix-bg rounded transition-colors text-veltrix-muted hover:text-blue-500"
                                    title="Editar"
                                  >
                                    <ng-icon name="lucideSettings" size="14" />
                                  </button>
                                  <button
                                    (click)="deleteType(type)"
                                    class="p-1.5 hover:bg-veltrix-bg rounded transition-colors text-veltrix-muted hover:text-red-500"
                                    title="Eliminar"
                                  >
                                    <ng-icon name="lucideTrash2" size="14" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          }
                        </tbody>
                      </table>
                    </div>
                  }

                  <!-- Subtypes Table -->
                  @if (catalogTab() === 'subtypes') {
                    <div class="overflow-x-auto">
                      <table class="data-table w-full">
                        <thead>
                          <tr>
                            <th>Código</th>
                            <th>Nombre</th>
                            <th>Tipo Padre</th>
                            <th>Severidad</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          @for (subtype of catalogSubtypes(); track subtype.id) {
                            <tr>
                              <td class="font-mono text-xs">{{ subtype.code }}</td>
                              <td class="font-medium text-veltrix-text">{{ subtype.name }}</td>
                              <td class="text-veltrix-muted">{{ getTypeName(subtype.typeId) }}</td>
                              <td>
                                <span class="px-2 py-1 rounded text-xs font-medium"
                                      [class]="getSeverityClass(subtype.severity)">
                                  {{ subtype.severity }}
                                </span>
                              </td>
                              <td>
                                <span class="px-2 py-1 rounded text-xs font-medium"
                                      [class]="subtype.isActive ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'">
                                  {{ subtype.isActive ? 'Activo' : 'Inactivo' }}
                                </span>
                              </td>
                              <td>
                                <div class="flex items-center gap-1">
                                  <button
                                    (click)="editSubtype(subtype)"
                                    class="p-1.5 hover:bg-veltrix-bg rounded transition-colors text-veltrix-muted hover:text-blue-500"
                                    title="Editar"
                                  >
                                    <ng-icon name="lucideSettings" size="14" />
                                  </button>
                                  <button
                                    (click)="deleteSubtype(subtype)"
                                    class="p-1.5 hover:bg-veltrix-bg rounded transition-colors text-veltrix-muted hover:text-red-500"
                                    title="Eliminar"
                                  >
                                    <ng-icon name="lucideTrash2" size="14" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          }
                        </tbody>
                      </table>
                    </div>
                  }
                </div>
              }

              <!-- Users Section -->
              @if (activeSection() === 'users') {
                <div class="p-6">
                  <div class="flex items-center justify-between mb-6">
                    <div>
                      <h2 class="text-xl font-bold text-veltrix-text">Usuarios y Perfiles</h2>
                      <p class="text-sm text-veltrix-muted">Gestión de usuarios, roles y permisos</p>
                    </div>
                    <div class="flex items-center gap-2">
                      <button
                        (click)="openRoleModal()"
                        class="flex items-center gap-2 px-4 py-2 bg-veltrix-bg border border-veltrix-border text-veltrix-text rounded-lg hover:bg-veltrix-card transition-colors"
                      >
                        <ng-icon name="lucideShield" size="16" />
                        <span>Gestionar Roles</span>
                      </button>
                      <button
                        (click)="openUserModal()"
                        class="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                      >
                        <ng-icon name="lucidePlus" size="16" />
                        <span>Nuevo Usuario</span>
                      </button>
                    </div>
                  </div>

                  <!-- Users Stats -->
                  <div class="grid grid-cols-4 gap-4 mb-6">
                    <div class="bg-veltrix-bg rounded-xl p-4 border border-veltrix-border">
                      <div class="flex items-center gap-3">
                        <div class="p-2 bg-purple-500/20 rounded-lg">
                          <ng-icon name="lucideUsers" class="text-purple-500" size="20" />
                        </div>
                        <div>
                          <div class="text-2xl font-bold text-veltrix-text">{{ users().length }}</div>
                          <div class="text-xs text-veltrix-muted">Total Usuarios</div>
                        </div>
                      </div>
                    </div>
                    <div class="bg-veltrix-bg rounded-xl p-4 border border-veltrix-border">
                      <div class="flex items-center gap-3">
                        <div class="p-2 bg-green-500/20 rounded-lg">
                          <ng-icon name="lucideUserCheck" class="text-green-500" size="20" />
                        </div>
                        <div>
                          <div class="text-2xl font-bold text-veltrix-text">{{ activeUsersCount() }}</div>
                          <div class="text-xs text-veltrix-muted">Activos</div>
                        </div>
                      </div>
                    </div>
                    <div class="bg-veltrix-bg rounded-xl p-4 border border-veltrix-border">
                      <div class="flex items-center gap-3">
                        <div class="p-2 bg-blue-500/20 rounded-lg">
                          <ng-icon name="lucideShield" class="text-blue-500" size="20" />
                        </div>
                        <div>
                          <div class="text-2xl font-bold text-veltrix-text">{{ roles().length }}</div>
                          <div class="text-xs text-veltrix-muted">Roles</div>
                        </div>
                      </div>
                    </div>
                    <div class="bg-veltrix-bg rounded-xl p-4 border border-veltrix-border">
                      <div class="flex items-center gap-3">
                        <div class="p-2 bg-amber-500/20 rounded-lg">
                          <ng-icon name="lucideKey" class="text-amber-500" size="20" />
                        </div>
                        <div>
                          <div class="text-2xl font-bold text-veltrix-text">{{ adminUsersCount() }}</div>
                          <div class="text-xs text-veltrix-muted">Administradores</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Users Table -->
                  <div class="overflow-x-auto">
                    <table class="data-table w-full">
                      <thead>
                        <tr>
                          <th>Usuario</th>
                          <th>Email</th>
                          <th>Rol</th>
                          <th>Polígonos</th>
                          <th>Estado</th>
                          <th>Último Acceso</th>
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        @for (user of users(); track user.id) {
                          <tr>
                            <td>
                              <div class="flex items-center gap-3">
                                <div class="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                                     [style.background-color]="getAvatarColor(user.name)">
                                  {{ getInitials(user.name) }}
                                </div>
                                <div>
                                  <div class="font-medium text-veltrix-text">{{ user.name }}</div>
                                  <div class="text-xs text-veltrix-muted">&#64;{{ user.username }}</div>
                                </div>
                              </div>
                            </td>
                            <td class="text-veltrix-muted">{{ user.email }}</td>
                            <td>
                              <span class="px-2 py-1 rounded text-xs font-medium"
                                    [class]="getRoleClass(user.role)">
                                {{ getRoleName(user.role) }}
                              </span>
                            </td>
                            <td>
                              <div class="flex items-center gap-1">
                                <ng-icon name="lucideMapPin" class="text-veltrix-muted" size="12" />
                                <span class="text-sm text-veltrix-text">{{ user.polygons?.length || 0 }}</span>
                              </div>
                            </td>
                            <td>
                              <span class="flex items-center gap-1.5">
                                <span class="w-2 h-2 rounded-full"
                                      [class]="user.isActive ? 'bg-green-500' : 'bg-gray-400'"></span>
                                <span class="text-sm" [class]="user.isActive ? 'text-green-500' : 'text-veltrix-muted'">
                                  {{ user.isActive ? 'Activo' : 'Inactivo' }}
                                </span>
                              </span>
                            </td>
                            <td class="text-xs text-veltrix-muted">{{ user.lastLogin || 'Nunca' }}</td>
                            <td>
                              <div class="flex items-center gap-1">
                                <button
                                  (click)="editUser(user)"
                                  class="p-1.5 hover:bg-veltrix-bg rounded transition-colors text-veltrix-muted hover:text-blue-500"
                                  title="Editar"
                                >
                                  <ng-icon name="lucideEdit" size="14" />
                                </button>
                                <button
                                  (click)="toggleUserStatus(user)"
                                  class="p-1.5 hover:bg-veltrix-bg rounded transition-colors text-veltrix-muted"
                                  [class.hover:text-green-500]="!user.isActive"
                                  [class.hover:text-orange-500]="user.isActive"
                                  [title]="user.isActive ? 'Desactivar' : 'Activar'"
                                >
                                  <ng-icon [name]="user.isActive ? 'lucideUserX' : 'lucideUserCheck'" size="14" />
                                </button>
                                <button
                                  (click)="deleteUser(user)"
                                  class="p-1.5 hover:bg-veltrix-bg rounded transition-colors text-veltrix-muted hover:text-red-500"
                                  title="Eliminar"
                                >
                                  <ng-icon name="lucideTrash2" size="14" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        } @empty {
                          <tr>
                            <td colspan="7" class="text-center py-12 text-veltrix-muted">
                              No hay usuarios registrados
                            </td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                </div>
              }

              <!-- SSO Section -->
              @if (activeSection() === 'sso') {
                <div class="p-6">
                  <div class="flex items-center justify-between mb-6">
                    <div>
                      <h2 class="text-xl font-bold text-veltrix-text">Autenticación SSO</h2>
                      <p class="text-sm text-veltrix-muted">Configuración de login con Microsoft y Google</p>
                    </div>
                  </div>

                  <div class="grid grid-cols-2 gap-6">
                    <!-- Microsoft -->
                    <div class="bg-veltrix-bg rounded-xl p-6 border border-veltrix-border">
                      <div class="flex items-center gap-3 mb-6">
                        <div class="w-12 h-12 bg-[#0078d4] rounded-xl flex items-center justify-center">
                          <svg class="w-6 h-6 text-white" viewBox="0 0 21 21" fill="currentColor">
                            <rect width="9" height="9"/>
                            <rect x="11" width="9" height="9"/>
                            <rect y="11" width="9" height="9"/>
                            <rect x="11" y="11" width="9" height="9"/>
                          </svg>
                        </div>
                        <div>
                          <h3 class="font-bold text-veltrix-text">Microsoft Azure AD</h3>
                          <span class="text-xs text-veltrix-muted">SSO con cuentas Microsoft</span>
                        </div>
                      </div>
                      <div class="space-y-4">
                        <div>
                          <label class="text-xs text-veltrix-muted mb-1 block">Client ID</label>
                          <input type="text" placeholder="Application (client) ID"
                                 class="w-full px-3 py-2 bg-veltrix-card border border-veltrix-border rounded-lg text-veltrix-text text-sm" />
                        </div>
                        <div>
                          <label class="text-xs text-veltrix-muted mb-1 block">Tenant ID</label>
                          <input type="text" placeholder="Directory (tenant) ID"
                                 class="w-full px-3 py-2 bg-veltrix-card border border-veltrix-border rounded-lg text-veltrix-text text-sm" />
                        </div>
                        <div>
                          <label class="text-xs text-veltrix-muted mb-1 block">Client Secret</label>
                          <input type="password" placeholder="••••••••"
                                 class="w-full px-3 py-2 bg-veltrix-card border border-veltrix-border rounded-lg text-veltrix-text text-sm" />
                        </div>
                      </div>
                    </div>

                    <!-- Google -->
                    <div class="bg-veltrix-bg rounded-xl p-6 border border-veltrix-border">
                      <div class="flex items-center gap-3 mb-6">
                        <div class="w-12 h-12 bg-white rounded-xl flex items-center justify-center border border-gray-200">
                          <svg class="w-6 h-6" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                          </svg>
                        </div>
                        <div>
                          <h3 class="font-bold text-veltrix-text">Google OAuth 2.0</h3>
                          <span class="text-xs text-veltrix-muted">SSO con cuentas Google</span>
                        </div>
                      </div>
                      <div class="space-y-4">
                        <div>
                          <label class="text-xs text-veltrix-muted mb-1 block">Client ID</label>
                          <input type="text" placeholder="Google Client ID"
                                 class="w-full px-3 py-2 bg-veltrix-card border border-veltrix-border rounded-lg text-veltrix-text text-sm" />
                        </div>
                        <div>
                          <label class="text-xs text-veltrix-muted mb-1 block">Client Secret</label>
                          <input type="password" placeholder="••••••••"
                                 class="w-full px-3 py-2 bg-veltrix-card border border-veltrix-border rounded-lg text-veltrix-text text-sm" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              }

              <!-- Settings Section -->
              @if (activeSection() === 'settings') {
                <div class="p-6">
                  <div class="flex items-center justify-between mb-6">
                    <div>
                      <h2 class="text-xl font-bold text-veltrix-text">Configuración del Sistema</h2>
                      <p class="text-sm text-veltrix-muted">Parámetros generales y configuraciones avanzadas</p>
                    </div>
                    <button class="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
                      <ng-icon name="lucideSave" size="16" />
                      <span>Guardar Cambios</span>
                    </button>
                  </div>

                  <div class="grid grid-cols-2 gap-6">
                    <!-- Database -->
                    <div class="bg-veltrix-bg rounded-xl p-4 border border-veltrix-border">
                      <div class="flex items-center gap-2 mb-4">
                        <ng-icon name="lucideDatabase" class="text-blue-500" size="18" />
                        <span class="font-medium text-veltrix-text">Base de Datos</span>
                      </div>
                      <div class="space-y-3">
                        <div>
                          <label class="text-xs text-veltrix-muted mb-1 block">Host</label>
                          <input type="text" value="localhost" class="w-full px-3 py-2 bg-veltrix-card border border-veltrix-border rounded-lg text-veltrix-text text-sm" />
                        </div>
                        <div>
                          <label class="text-xs text-veltrix-muted mb-1 block">Puerto</label>
                          <input type="number" value="5432" class="w-full px-3 py-2 bg-veltrix-card border border-veltrix-border rounded-lg text-veltrix-text text-sm" />
                        </div>
                      </div>
                    </div>

                    <!-- TTS -->
                    <div class="bg-veltrix-bg rounded-xl p-4 border border-veltrix-border">
                      <div class="flex items-center gap-2 mb-4">
                        <ng-icon name="lucideVolume2" class="text-purple-500" size="18" />
                        <span class="font-medium text-veltrix-text">Voz (TTS)</span>
                      </div>
                      <div class="space-y-3">
                        <div>
                          <label class="text-xs text-veltrix-muted mb-1 block">Voz Preferida</label>
                          <select class="w-full px-3 py-2 bg-veltrix-card border border-veltrix-border rounded-lg text-veltrix-text text-sm">
                            <option>es-AR-ElenaNeural (Argentina)</option>
                            <option>es-ES-ElviraNeural (España)</option>
                            <option>es-MX-DaliaNeural (México)</option>
                          </select>
                        </div>
                        <div>
                          <label class="text-xs text-veltrix-muted mb-1 block">Velocidad</label>
                          <select class="w-full px-3 py-2 bg-veltrix-card border border-veltrix-border rounded-lg text-veltrix-text text-sm">
                            <option>-10%</option>
                            <option selected>-5%</option>
                            <option>+0%</option>
                            <option>+5%</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              }

              <!-- Reports Section -->
              @if (activeSection() === 'reports') {
                <div class="p-6">
                  <div class="flex items-center justify-between mb-6">
                    <div>
                      <h2 class="text-xl font-bold text-veltrix-text">Reportes y Estadísticas</h2>
                      <p class="text-sm text-veltrix-muted">Estadísticas del sistema y exportación</p>
                    </div>
                  </div>

                  <div class="text-center py-16 text-veltrix-muted">
                    <ng-icon name="lucideBarChart3" size="64" class="mx-auto mb-4 opacity-30" />
                    <h3 class="text-lg font-medium text-veltrix-text">Próximamente</h3>
                    <p class="mt-2">Módulo de reportes en desarrollo</p>
                  </div>
                </div>
              }
            </div>
          </div>
        </div>
      </div>

      <!-- Polygon Modal -->
      <app-modal
        [isOpen]="polygonModalOpen()"
        [title]="editingPolygon() ? 'Editar Polígono' : 'Nuevo Polígono'"
        width="600px"
        (close)="closePolygonModal()"
      >
        <form (ngSubmit)="savePolygon()" class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="text-xs text-veltrix-muted mb-1 block">ID del Polígono *</label>
              <input
                type="text"
                [(ngModel)]="polygonForm.id"
                name="id"
                placeholder="P001"
                [disabled]="!!editingPolygon()"
                class="w-full px-3 py-2 bg-veltrix-bg border border-veltrix-border rounded-lg text-veltrix-text text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50"
              />
            </div>
            <div>
              <label class="text-xs text-veltrix-muted mb-1 block">Nombre *</label>
              <input
                type="text"
                [(ngModel)]="polygonForm.name"
                name="name"
                placeholder="Nombre del polígono"
                class="w-full px-3 py-2 bg-veltrix-bg border border-veltrix-border rounded-lg text-veltrix-text text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>
          </div>

          <div>
            <label class="text-xs text-veltrix-muted mb-1 block">Grupo</label>
            <input
              type="text"
              [(ngModel)]="polygonForm.group"
              name="group"
              placeholder="Ej: Zona Norte"
              class="w-full px-3 py-2 bg-veltrix-bg border border-veltrix-border rounded-lg text-veltrix-text text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>

          <div>
            <label class="text-xs text-veltrix-muted mb-1 block">Feed URL *</label>
            <input
              type="url"
              [(ngModel)]="polygonForm.feedUrl"
              name="feedUrl"
              placeholder="https://www.waze.com/row-partnerhub-api/..."
              class="w-full px-3 py-2 bg-veltrix-bg border border-veltrix-border rounded-lg text-veltrix-text text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="text-xs text-veltrix-muted mb-1 block">Latitud Centro</label>
              <input
                type="number"
                [(ngModel)]="polygonForm.centerLat"
                name="centerLat"
                step="0.0001"
                placeholder="-31.4201"
                class="w-full px-3 py-2 bg-veltrix-bg border border-veltrix-border rounded-lg text-veltrix-text text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>
            <div>
              <label class="text-xs text-veltrix-muted mb-1 block">Longitud Centro</label>
              <input
                type="number"
                [(ngModel)]="polygonForm.centerLng"
                name="centerLng"
                step="0.0001"
                placeholder="-64.1888"
                class="w-full px-3 py-2 bg-veltrix-bg border border-veltrix-border rounded-lg text-veltrix-text text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>
          </div>

          <div>
            <label class="text-xs text-veltrix-muted mb-1 block">Geometría GeoJSON (opcional)</label>
            <textarea
              [(ngModel)]="polygonForm.geometry"
              name="geometry"
              rows="4"
              placeholder='{"type": "Polygon", "coordinates": [[[...]]]}'
              class="w-full px-3 py-2 bg-veltrix-bg border border-veltrix-border rounded-lg text-veltrix-text text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            ></textarea>
          </div>
        </form>

        <div modal-footer class="flex items-center gap-3">
          <button
            (click)="closePolygonModal()"
            class="px-4 py-2 border border-veltrix-border rounded-lg text-veltrix-muted hover:text-veltrix-text hover:bg-veltrix-bg transition-colors"
          >
            Cancelar
          </button>
          <button
            (click)="savePolygon()"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <ng-icon name="lucideSave" size="16" />
            {{ editingPolygon() ? 'Actualizar' : 'Crear' }}
          </button>
        </div>
      </app-modal>

      <!-- Type Modal -->
      <app-modal
        [isOpen]="typeModalOpen()"
        [title]="editingType() ? 'Editar Tipo' : 'Nuevo Tipo'"
        width="500px"
        (close)="closeTypeModal()"
      >
        <form class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="text-xs text-veltrix-muted mb-1 block">Código *</label>
              <input
                type="text"
                [(ngModel)]="typeForm.code"
                name="code"
                placeholder="ACCIDENT"
                [disabled]="!!editingType()"
                class="w-full px-3 py-2 bg-veltrix-bg border border-veltrix-border rounded-lg text-veltrix-text text-sm uppercase focus:outline-none focus:ring-2 focus:ring-green-500/50 disabled:opacity-50"
              />
            </div>
            <div>
              <label class="text-xs text-veltrix-muted mb-1 block">Nombre *</label>
              <input
                type="text"
                [(ngModel)]="typeForm.name"
                name="name"
                placeholder="Accidente"
                class="w-full px-3 py-2 bg-veltrix-bg border border-veltrix-border rounded-lg text-veltrix-text text-sm focus:outline-none focus:ring-2 focus:ring-green-500/50"
              />
            </div>
          </div>

          <div>
            <label class="text-xs text-veltrix-muted mb-1 block">Descripción</label>
            <input
              type="text"
              [(ngModel)]="typeForm.description"
              name="description"
              placeholder="Descripción del tipo de incidente"
              class="w-full px-3 py-2 bg-veltrix-bg border border-veltrix-border rounded-lg text-veltrix-text text-sm focus:outline-none focus:ring-2 focus:ring-green-500/50"
            />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="text-xs text-veltrix-muted mb-1 block">Icono</label>
              <select
                [(ngModel)]="typeForm.icon"
                name="icon"
                class="w-full px-3 py-2 bg-veltrix-bg border border-veltrix-border rounded-lg text-veltrix-text text-sm focus:outline-none focus:ring-2 focus:ring-green-500/50"
              >
                <option value="car">Vehículo</option>
                <option value="alert-triangle">Alerta</option>
                <option value="map-pin">Marcador</option>
                <option value="construction">Construcción</option>
                <option value="cloud">Clima</option>
              </select>
            </div>
            <div>
              <label class="text-xs text-veltrix-muted mb-1 block">Color</label>
              <div class="flex gap-2">
                <input
                  type="color"
                  [(ngModel)]="typeForm.color"
                  name="color"
                  class="w-12 h-10 rounded border border-veltrix-border cursor-pointer"
                />
                <input
                  type="text"
                  [(ngModel)]="typeForm.color"
                  name="colorText"
                  placeholder="#ef4444"
                  class="flex-1 px-3 py-2 bg-veltrix-bg border border-veltrix-border rounded-lg text-veltrix-text text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-500/50"
                />
              </div>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <input
              type="checkbox"
              [(ngModel)]="typeForm.isActive"
              name="isActive"
              id="typeIsActive"
              class="w-4 h-4 rounded border-veltrix-border"
            />
            <label for="typeIsActive" class="text-sm text-veltrix-text">Activo</label>
          </div>
        </form>

        <div modal-footer class="flex items-center gap-3">
          <button
            (click)="closeTypeModal()"
            class="px-4 py-2 border border-veltrix-border rounded-lg text-veltrix-muted hover:text-veltrix-text hover:bg-veltrix-bg transition-colors"
          >
            Cancelar
          </button>
          <button
            (click)="saveType()"
            class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <ng-icon name="lucideSave" size="16" />
            {{ editingType() ? 'Actualizar' : 'Crear' }}
          </button>
        </div>
      </app-modal>

      <!-- Subtype Modal -->
      <app-modal
        [isOpen]="subtypeModalOpen()"
        [title]="editingSubtype() ? 'Editar Subtipo' : 'Nuevo Subtipo'"
        width="500px"
        (close)="closeSubtypeModal()"
      >
        <form class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="text-xs text-veltrix-muted mb-1 block">Código *</label>
              <input
                type="text"
                [(ngModel)]="subtypeForm.code"
                name="code"
                placeholder="ACCIDENT_MINOR"
                [disabled]="!!editingSubtype()"
                class="w-full px-3 py-2 bg-veltrix-bg border border-veltrix-border rounded-lg text-veltrix-text text-sm uppercase focus:outline-none focus:ring-2 focus:ring-green-500/50 disabled:opacity-50"
              />
            </div>
            <div>
              <label class="text-xs text-veltrix-muted mb-1 block">Nombre *</label>
              <input
                type="text"
                [(ngModel)]="subtypeForm.name"
                name="name"
                placeholder="Accidente Menor"
                class="w-full px-3 py-2 bg-veltrix-bg border border-veltrix-border rounded-lg text-veltrix-text text-sm focus:outline-none focus:ring-2 focus:ring-green-500/50"
              />
            </div>
          </div>

          <div>
            <label class="text-xs text-veltrix-muted mb-1 block">Tipo Padre *</label>
            <select
              [(ngModel)]="subtypeForm.typeId"
              name="typeId"
              class="w-full px-3 py-2 bg-veltrix-bg border border-veltrix-border rounded-lg text-veltrix-text text-sm focus:outline-none focus:ring-2 focus:ring-green-500/50"
            >
              <option value="">Seleccionar tipo...</option>
              @for (type of catalogTypes(); track type.id) {
                <option [value]="type.id">{{ type.name }} ({{ type.code }})</option>
              }
            </select>
          </div>

          <div>
            <label class="text-xs text-veltrix-muted mb-1 block">Severidad *</label>
            <select
              [(ngModel)]="subtypeForm.severity"
              name="severity"
              class="w-full px-3 py-2 bg-veltrix-bg border border-veltrix-border rounded-lg text-veltrix-text text-sm focus:outline-none focus:ring-2 focus:ring-green-500/50"
            >
              <option value="LOW">Baja</option>
              <option value="MEDIUM">Media</option>
              <option value="HIGH">Alta</option>
              <option value="CRITICAL">Crítica</option>
            </select>
          </div>

          <div class="flex items-center gap-2">
            <input
              type="checkbox"
              [(ngModel)]="subtypeForm.isActive"
              name="isActive"
              id="subtypeIsActive"
              class="w-4 h-4 rounded border-veltrix-border"
            />
            <label for="subtypeIsActive" class="text-sm text-veltrix-text">Activo</label>
          </div>
        </form>

        <div modal-footer class="flex items-center gap-3">
          <button
            (click)="closeSubtypeModal()"
            class="px-4 py-2 border border-veltrix-border rounded-lg text-veltrix-muted hover:text-veltrix-text hover:bg-veltrix-bg transition-colors"
          >
            Cancelar
          </button>
          <button
            (click)="saveSubtype()"
            class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <ng-icon name="lucideSave" size="16" />
            {{ editingSubtype() ? 'Actualizar' : 'Crear' }}
          </button>
        </div>
      </app-modal>

      <!-- User Modal -->
      <app-modal
        [isOpen]="userModalOpen()"
        [title]="editingUser() ? 'Editar Usuario' : 'Nuevo Usuario'"
        width="600px"
        (close)="closeUserModal()"
      >
        <form class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="text-xs text-veltrix-muted mb-1 block">Nombre Completo *</label>
              <input
                type="text"
                [(ngModel)]="userForm.name"
                name="name"
                placeholder="Juan Pérez"
                class="w-full px-3 py-2 bg-veltrix-bg border border-veltrix-border rounded-lg text-veltrix-text text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              />
            </div>
            <div>
              <label class="text-xs text-veltrix-muted mb-1 block">Nombre de Usuario *</label>
              <input
                type="text"
                [(ngModel)]="userForm.username"
                name="username"
                placeholder="jperez"
                [disabled]="!!editingUser()"
                class="w-full px-3 py-2 bg-veltrix-bg border border-veltrix-border rounded-lg text-veltrix-text text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 disabled:opacity-50"
              />
            </div>
          </div>

          <div>
            <label class="text-xs text-veltrix-muted mb-1 block">Email *</label>
            <input
              type="email"
              [(ngModel)]="userForm.email"
              name="email"
              placeholder="juan.perez&#64;empresa.com"
              class="w-full px-3 py-2 bg-veltrix-bg border border-veltrix-border rounded-lg text-veltrix-text text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            />
          </div>

          @if (!editingUser()) {
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="text-xs text-veltrix-muted mb-1 block">Contraseña *</label>
                <input
                  type="password"
                  [(ngModel)]="userForm.password"
                  name="password"
                  placeholder="••••••••"
                  class="w-full px-3 py-2 bg-veltrix-bg border border-veltrix-border rounded-lg text-veltrix-text text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                />
              </div>
              <div>
                <label class="text-xs text-veltrix-muted mb-1 block">Confirmar Contraseña *</label>
                <input
                  type="password"
                  [(ngModel)]="userForm.confirmPassword"
                  name="confirmPassword"
                  placeholder="••••••••"
                  class="w-full px-3 py-2 bg-veltrix-bg border border-veltrix-border rounded-lg text-veltrix-text text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                />
              </div>
            </div>
          }

          <div>
            <label class="text-xs text-veltrix-muted mb-1 block">Rol *</label>
            <select
              [(ngModel)]="userForm.role"
              name="role"
              class="w-full px-3 py-2 bg-veltrix-bg border border-veltrix-border rounded-lg text-veltrix-text text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            >
              @for (role of roles(); track role.id) {
                <option [value]="role.id">{{ role.name }}</option>
              }
            </select>
          </div>

          <div>
            <label class="text-xs text-veltrix-muted mb-1 block">Polígonos Asignados</label>
            <div class="max-h-32 overflow-y-auto bg-veltrix-bg border border-veltrix-border rounded-lg p-2">
              @for (polygon of polygons(); track polygon.id) {
                <label class="flex items-center gap-2 p-1.5 hover:bg-veltrix-card rounded cursor-pointer">
                  <input
                    type="checkbox"
                    [checked]="userForm.polygons.includes(polygon.id)"
                    (change)="toggleUserPolygon(polygon.id)"
                    class="w-4 h-4 rounded border-veltrix-border"
                  />
                  <span class="text-sm text-veltrix-text">{{ polygon.name }}</span>
                  <span class="text-xs text-veltrix-muted">({{ polygon.group }})</span>
                </label>
              }
            </div>
          </div>

          <div class="flex items-center gap-2">
            <input
              type="checkbox"
              [(ngModel)]="userForm.isActive"
              name="isActive"
              id="userIsActive"
              class="w-4 h-4 rounded border-veltrix-border"
            />
            <label for="userIsActive" class="text-sm text-veltrix-text">Usuario Activo</label>
          </div>
        </form>

        <div modal-footer class="flex items-center gap-3">
          <button
            (click)="closeUserModal()"
            class="px-4 py-2 border border-veltrix-border rounded-lg text-veltrix-muted hover:text-veltrix-text hover:bg-veltrix-bg transition-colors"
          >
            Cancelar
          </button>
          <button
            (click)="saveUser()"
            class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
          >
            <ng-icon name="lucideSave" size="16" />
            {{ editingUser() ? 'Actualizar' : 'Crear' }}
          </button>
        </div>
      </app-modal>

      <!-- Role Modal -->
      <app-modal
        [isOpen]="roleModalOpen()"
        title="Gestión de Roles"
        width="700px"
        (close)="closeRoleModal()"
      >
        <div class="space-y-4">
          <!-- Role List -->
          <div class="space-y-2">
            @for (role of roles(); track role.id) {
              <div class="flex items-center justify-between p-3 bg-veltrix-bg rounded-lg border border-veltrix-border">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-lg flex items-center justify-center"
                       [style.background-color]="role.color + '20'">
                    <ng-icon name="lucideShield" [style.color]="role.color" size="18" />
                  </div>
                  <div>
                    <div class="font-medium text-veltrix-text">{{ role.name }}</div>
                    <div class="text-xs text-veltrix-muted">{{ role.description }}</div>
                  </div>
                </div>
                <div class="flex items-center gap-4">
                  <div class="flex flex-wrap gap-1 max-w-[200px]">
                    @for (perm of role.permissions.slice(0, 3); track perm) {
                      <span class="px-1.5 py-0.5 bg-veltrix-card rounded text-[10px] text-veltrix-muted">{{ perm }}</span>
                    }
                    @if (role.permissions.length > 3) {
                      <span class="px-1.5 py-0.5 bg-veltrix-card rounded text-[10px] text-veltrix-muted">+{{ role.permissions.length - 3 }}</span>
                    }
                  </div>
                  <div class="flex items-center gap-1">
                    <button
                      (click)="editRole(role)"
                      class="p-1.5 hover:bg-veltrix-card rounded transition-colors text-veltrix-muted hover:text-blue-500"
                    >
                      <ng-icon name="lucideEdit" size="14" />
                    </button>
                    @if (!role.isSystem) {
                      <button
                        (click)="deleteRole(role)"
                        class="p-1.5 hover:bg-veltrix-card rounded transition-colors text-veltrix-muted hover:text-red-500"
                      >
                        <ng-icon name="lucideTrash2" size="14" />
                      </button>
                    }
                  </div>
                </div>
              </div>
            }
          </div>

          <!-- Add New Role Form -->
          <div class="border-t border-veltrix-border pt-4">
            <div class="text-sm font-medium text-veltrix-text mb-3">{{ editingRole() ? 'Editar Rol' : 'Agregar Nuevo Rol' }}</div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="text-xs text-veltrix-muted mb-1 block">Nombre del Rol</label>
                <input
                  type="text"
                  [(ngModel)]="roleForm.name"
                  placeholder="Supervisor"
                  class="w-full px-3 py-2 bg-veltrix-bg border border-veltrix-border rounded-lg text-veltrix-text text-sm"
                />
              </div>
              <div>
                <label class="text-xs text-veltrix-muted mb-1 block">Color</label>
                <div class="flex gap-2">
                  <input
                    type="color"
                    [(ngModel)]="roleForm.color"
                    class="w-10 h-10 rounded border border-veltrix-border cursor-pointer"
                  />
                  <input
                    type="text"
                    [(ngModel)]="roleForm.color"
                    placeholder="#8b5cf6"
                    class="flex-1 px-3 py-2 bg-veltrix-bg border border-veltrix-border rounded-lg text-veltrix-text text-sm font-mono"
                  />
                </div>
              </div>
            </div>
            <div class="mt-3">
              <label class="text-xs text-veltrix-muted mb-1 block">Descripción</label>
              <input
                type="text"
                [(ngModel)]="roleForm.description"
                placeholder="Descripción del rol"
                class="w-full px-3 py-2 bg-veltrix-bg border border-veltrix-border rounded-lg text-veltrix-text text-sm"
              />
            </div>
            <div class="mt-3">
              <label class="text-xs text-veltrix-muted mb-2 block">Permisos</label>
              <div class="grid grid-cols-3 gap-2">
                @for (perm of availablePermissions; track perm.id) {
                  <label class="flex items-center gap-2 p-2 bg-veltrix-bg rounded-lg cursor-pointer hover:bg-veltrix-card">
                    <input
                      type="checkbox"
                      [checked]="roleForm.permissions.includes(perm.id)"
                      (change)="toggleRolePermission(perm.id)"
                      class="w-4 h-4 rounded border-veltrix-border"
                    />
                    <span class="text-xs text-veltrix-text">{{ perm.label }}</span>
                  </label>
                }
              </div>
            </div>
            <div class="mt-4 flex justify-end">
              <button
                (click)="saveRole()"
                class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
              >
                <ng-icon name="lucidePlus" size="16" />
                {{ editingRole() ? 'Actualizar Rol' : 'Agregar Rol' }}
              </button>
            </div>
          </div>
        </div>

        <div modal-footer class="flex items-center justify-end">
          <button
            (click)="closeRoleModal()"
            class="px-4 py-2 bg-veltrix-bg border border-veltrix-border rounded-lg text-veltrix-text hover:bg-veltrix-card transition-colors"
          >
            Cerrar
          </button>
        </div>
      </app-modal>

      <!-- Footer -->
      <footer class="bg-veltrix-card border-t border-veltrix-border px-6 py-3 mt-6">
        <div class="flex items-center justify-between text-xs text-veltrix-muted">
          <span>© 2026 <strong>Caminos de las Sierras S.A.</strong> • Desarrollado por <strong>GED</strong></span>
          <span class="flex items-center gap-2">
            <span>● Admin Panel v1.0</span>
            <span class="text-veltrix-primary">• Panel Waze</span>
          </span>
        </div>
      </footer>
    </div>
  `,
})
export class AdminComponent implements OnInit {
  private apiService = inject(ApiService);

  readonly activeSection = signal<AdminSection>('polygons');
  readonly catalogTab = signal<'types' | 'subtypes'>('types');

  // Modal states
  readonly polygonModalOpen = signal(false);
  readonly typeModalOpen = signal(false);
  readonly subtypeModalOpen = signal(false);
  readonly userModalOpen = signal(false);
  readonly roleModalOpen = signal(false);

  // Editing states
  readonly editingPolygon = signal<Polygon | null>(null);
  readonly editingType = signal<CatalogType | null>(null);
  readonly editingSubtype = signal<CatalogSubtype | null>(null);
  readonly editingUser = signal<User | null>(null);
  readonly editingRole = signal<Role | null>(null);

  readonly polygons = signal<Polygon[]>([]);

  // Polygon form
  polygonForm: PolygonForm = {
    id: '',
    name: '',
    group: '',
    feedUrl: '',
    centerLat: null,
    centerLng: null,
    geometry: '',
  };

  // Type form
  typeForm: TypeForm = {
    id: '',
    code: '',
    name: '',
    description: '',
    icon: 'alert-triangle',
    color: '#ef4444',
    isActive: true,
  };

  // Subtype form
  subtypeForm: SubtypeForm = {
    id: '',
    code: '',
    name: '',
    typeId: '',
    severity: 'MEDIUM',
    isActive: true,
  };

  // User form
  userForm: UserForm = {
    id: '',
    name: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'operator',
    polygons: [],
    isActive: true,
  };

  // Role form
  roleForm: RoleForm = {
    id: '',
    name: '',
    description: '',
    color: '#8b5cf6',
    permissions: [],
  };

  // Users data
  readonly users = signal<User[]>([
    { id: '1', name: 'Admin Sistema', username: 'admin', email: 'admin@casisa.com.ar', role: 'admin', polygons: [], isActive: true, lastLogin: '2026-02-05 14:30' },
    { id: '2', name: 'Juan Pérez', username: 'jperez', email: 'juan.perez@casisa.com.ar', role: 'supervisor', polygons: ['P001', 'P002'], isActive: true, lastLogin: '2026-02-05 10:15' },
    { id: '3', name: 'María García', username: 'mgarcia', email: 'maria.garcia@casisa.com.ar', role: 'operator', polygons: ['P001'], isActive: true, lastLogin: '2026-02-04 16:45' },
    { id: '4', name: 'Carlos López', username: 'clopez', email: 'carlos.lopez@casisa.com.ar', role: 'viewer', polygons: ['P003'], isActive: false, lastLogin: '2026-01-20 09:00' },
  ]);

  // Roles data
  readonly roles = signal<Role[]>([
    { id: 'admin', name: 'Administrador', description: 'Acceso total al sistema', color: '#ef4444', permissions: ['all'], isSystem: true },
    { id: 'supervisor', name: 'Supervisor', description: 'Gestión de operadores y polígonos', color: '#f59e0b', permissions: ['view', 'edit', 'manage_users', 'manage_polygons'], isSystem: true },
    { id: 'operator', name: 'Operador', description: 'Monitoreo y gestión de incidentes', color: '#22c55e', permissions: ['view', 'edit', 'manage_incidents'], isSystem: true },
    { id: 'viewer', name: 'Visualizador', description: 'Solo lectura', color: '#6b7280', permissions: ['view'], isSystem: true },
  ]);

  // Available permissions
  readonly availablePermissions: Permission[] = [
    { id: 'view', label: 'Ver Dashboard' },
    { id: 'edit', label: 'Editar Datos' },
    { id: 'manage_incidents', label: 'Gestionar Incidentes' },
    { id: 'manage_polygons', label: 'Gestionar Polígonos' },
    { id: 'manage_users', label: 'Gestionar Usuarios' },
    { id: 'manage_catalogs', label: 'Gestionar Catálogos' },
    { id: 'view_reports', label: 'Ver Reportes' },
    { id: 'export_data', label: 'Exportar Datos' },
    { id: 'admin_settings', label: 'Config. Sistema' },
  ];

  // Computed
  readonly activeUsersCount = () => this.users().filter(u => u.isActive).length;
  readonly adminUsersCount = () => this.users().filter(u => u.role === 'admin' || u.role === 'supervisor').length;

  readonly menuItems: AdminMenuItem[] = [
    { id: 'polygons', label: 'Polígonos Waze', icon: 'lucideDatabase', description: 'Gestión de polígonos y feeds', gradient: 'from-blue-600 to-blue-700' },
    { id: 'catalogs', label: 'Catálogos', icon: 'lucideFileText', description: 'Tipos y subtipos de incidentes', gradient: 'from-green-600 to-green-700' },
    { id: 'users', label: 'Usuarios & Perfiles', icon: 'lucideUsers', description: 'Gestión de usuarios y permisos', gradient: 'from-purple-600 to-purple-700' },
    { id: 'sso', label: 'Autenticación SSO', icon: 'lucideShieldCheck', description: 'Login con Microsoft y Google', gradient: 'from-orange-600 to-orange-700' },
    { id: 'settings', label: 'Configuración', icon: 'lucideSettings', description: 'Parámetros del sistema', gradient: 'from-gray-600 to-gray-700' },
    { id: 'reports', label: 'Reportes', icon: 'lucideBarChart3', description: 'Estadísticas y reportes', gradient: 'from-indigo-600 to-indigo-700' },
  ];

  readonly catalogTypes = signal<CatalogType[]>([
    { id: '1', code: 'ACCIDENT', name: 'Accidente', description: 'Accidentes de tránsito', icon: 'car', color: '#ef4444', isActive: true },
    { id: '2', code: 'HAZARD', name: 'Peligro', description: 'Peligros en la vía', icon: 'alert-triangle', color: '#f59e0b', isActive: true },
    { id: '3', code: 'JAM', name: 'Congestión', description: 'Tráfico congestionado', icon: 'map-pin', color: '#f97316', isActive: true },
    { id: '4', code: 'ROAD_CLOSED', name: 'Cierre de Ruta', description: 'Cierres viales', icon: 'construction', color: '#8b5cf6', isActive: true },
    { id: '5', code: 'WEATHERHAZARD', name: 'Clima', description: 'Peligros climáticos', icon: 'cloud', color: '#06b6d4', isActive: true },
  ]);

  readonly catalogSubtypes = signal<CatalogSubtype[]>([
    { id: '1', typeId: '1', code: 'ACCIDENT_MINOR', name: 'Accidente Menor', severity: 'LOW', isActive: true },
    { id: '2', typeId: '1', code: 'ACCIDENT_MAJOR', name: 'Accidente Mayor', severity: 'HIGH', isActive: true },
    { id: '3', typeId: '2', code: 'HAZARD_ON_ROAD', name: 'Objeto en la Vía', severity: 'MEDIUM', isActive: true },
    { id: '4', typeId: '2', code: 'HAZARD_CAR_STOPPED', name: 'Vehículo Detenido', severity: 'LOW', isActive: true },
  ]);

  ngOnInit(): void {
    this.apiService.polygons$.subscribe(data => this.polygons.set(data || []));
  }

  getTypeIcon(icon: string): string {
    const icons: Record<string, string> = {
      car: 'lucideCar',
      'alert-triangle': 'lucideAlertTriangle',
      'map-pin': 'lucideMapPin',
      construction: 'lucideConstruction',
      cloud: 'lucideCloudRain',
    };
    return icons[icon] || 'lucideAlertTriangle';
  }

  getTypeName(typeId: string): string {
    const type = this.catalogTypes().find(t => t.id === typeId);
    return type?.name || 'Desconocido';
  }

  getSeverityClass(severity: string): string {
    const classes: Record<string, string> = {
      LOW: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      MEDIUM: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
      HIGH: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
      CRITICAL: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
    };
    return classes[severity] || 'bg-gray-100 text-gray-800';
  }

  // Polygon CRUD methods
  openPolygonModal(polygon?: Polygon): void {
    if (polygon) {
      this.editingPolygon.set(polygon);
      this.polygonForm = {
        id: polygon.id,
        name: polygon.name,
        group: polygon.group || '',
        feedUrl: polygon.feedUrl || '',
        centerLat: polygon.center?.lat || null,
        centerLng: polygon.center?.lng || null,
        geometry: polygon.geometry ? JSON.stringify(polygon.geometry) : '',
      };
    } else {
      this.editingPolygon.set(null);
      this.resetPolygonForm();
    }
    this.polygonModalOpen.set(true);
  }

  closePolygonModal(): void {
    this.polygonModalOpen.set(false);
    this.editingPolygon.set(null);
    this.resetPolygonForm();
  }

  resetPolygonForm(): void {
    this.polygonForm = {
      id: '',
      name: '',
      group: '',
      feedUrl: '',
      centerLat: null,
      centerLng: null,
      geometry: '',
    };
  }

  savePolygon(): void {
    if (!this.polygonForm.id || !this.polygonForm.name || !this.polygonForm.feedUrl) {
      alert('Por favor complete los campos obligatorios: ID, Nombre y Feed URL');
      return;
    }

    const polygonData = {
      id: this.polygonForm.id,
      name: this.polygonForm.name,
      group: this.polygonForm.group || undefined,
      feedUrl: this.polygonForm.feedUrl,
      center: this.polygonForm.centerLat && this.polygonForm.centerLng
        ? { lat: this.polygonForm.centerLat, lng: this.polygonForm.centerLng }
        : undefined,
      geometry: this.polygonForm.geometry
        ? JSON.parse(this.polygonForm.geometry)
        : undefined,
    };

    if (this.editingPolygon()) {
      console.log('Updating polygon:', polygonData);
      // TODO: Call API to update polygon
      // this.apiService.updatePolygon(polygonData.id, polygonData).subscribe(...)
    } else {
      console.log('Creating polygon:', polygonData);
      // TODO: Call API to create polygon
      // this.apiService.createPolygon(polygonData).subscribe(...)
    }

    this.closePolygonModal();
  }

  editPolygon(polygon: Polygon): void {
    this.openPolygonModal(polygon);
  }

  deletePolygon(polygon: Polygon): void {
    if (confirm(`¿Está seguro de eliminar el polígono "${polygon.name}"?`)) {
      console.log('Deleting polygon:', polygon.id);
      this.apiService.deletePolygon(polygon.id).subscribe(success => {
        if (success) {
          this.apiService.refreshPolygons();
        }
      });
    }
  }

  // ============================================
  // Type CRUD methods
  // ============================================

  openTypeModal(type?: CatalogType): void {
    if (type) {
      this.editingType.set(type);
      this.typeForm = {
        id: type.id,
        code: type.code,
        name: type.name,
        description: type.description || '',
        icon: type.icon,
        color: type.color,
        isActive: type.isActive,
      };
    } else {
      this.editingType.set(null);
      this.resetTypeForm();
    }
    this.typeModalOpen.set(true);
  }

  closeTypeModal(): void {
    this.typeModalOpen.set(false);
    this.editingType.set(null);
    this.resetTypeForm();
  }

  resetTypeForm(): void {
    this.typeForm = {
      id: '',
      code: '',
      name: '',
      description: '',
      icon: 'alert-triangle',
      color: '#ef4444',
      isActive: true,
    };
  }

  saveType(): void {
    if (!this.typeForm.code || !this.typeForm.name) {
      alert('Por favor complete los campos obligatorios: Código y Nombre');
      return;
    }

    const typeData: CatalogType = {
      id: this.editingType() ? this.typeForm.id : Date.now().toString(),
      code: this.typeForm.code.toUpperCase(),
      name: this.typeForm.name,
      description: this.typeForm.description,
      icon: this.typeForm.icon,
      color: this.typeForm.color,
      isActive: this.typeForm.isActive,
    };

    if (this.editingType()) {
      // Update existing type
      const types = this.catalogTypes();
      const index = types.findIndex(t => t.id === typeData.id);
      if (index >= 0) {
        types[index] = typeData;
        this.catalogTypes.set([...types]);
      }
      console.log('Updated type:', typeData);
    } else {
      // Create new type
      this.catalogTypes.update(types => [...types, typeData]);
      console.log('Created type:', typeData);
    }

    this.closeTypeModal();
  }

  editType(type: CatalogType): void {
    this.openTypeModal(type);
  }

  deleteType(type: CatalogType): void {
    if (confirm(`¿Está seguro de eliminar el tipo "${type.name}"?`)) {
      // Check if there are subtypes using this type
      const subtypesUsingType = this.catalogSubtypes().filter(s => s.typeId === type.id);
      if (subtypesUsingType.length > 0) {
        alert(`No se puede eliminar este tipo porque tiene ${subtypesUsingType.length} subtipo(s) asociado(s).`);
        return;
      }

      this.catalogTypes.update(types => types.filter(t => t.id !== type.id));
      console.log('Deleted type:', type.id);
    }
  }

  syncCatalogs(): void {
    console.log('Syncing catalogs with Waze...');
    // TODO: Implement API call to sync catalogs
    alert('Sincronización de catálogos iniciada. Esto puede tardar unos segundos.');
  }

  // ============================================
  // Subtype CRUD methods
  // ============================================

  openSubtypeModal(subtype?: CatalogSubtype): void {
    if (subtype) {
      this.editingSubtype.set(subtype);
      this.subtypeForm = {
        id: subtype.id,
        code: subtype.code,
        name: subtype.name,
        typeId: subtype.typeId,
        severity: subtype.severity,
        isActive: subtype.isActive,
      };
    } else {
      this.editingSubtype.set(null);
      this.resetSubtypeForm();
    }
    this.subtypeModalOpen.set(true);
  }

  closeSubtypeModal(): void {
    this.subtypeModalOpen.set(false);
    this.editingSubtype.set(null);
    this.resetSubtypeForm();
  }

  resetSubtypeForm(): void {
    this.subtypeForm = {
      id: '',
      code: '',
      name: '',
      typeId: '',
      severity: 'MEDIUM',
      isActive: true,
    };
  }

  saveSubtype(): void {
    if (!this.subtypeForm.code || !this.subtypeForm.name || !this.subtypeForm.typeId) {
      alert('Por favor complete los campos obligatorios: Código, Nombre y Tipo Padre');
      return;
    }

    const subtypeData: CatalogSubtype = {
      id: this.editingSubtype() ? this.subtypeForm.id : Date.now().toString(),
      code: this.subtypeForm.code.toUpperCase(),
      name: this.subtypeForm.name,
      typeId: this.subtypeForm.typeId,
      severity: this.subtypeForm.severity,
      isActive: this.subtypeForm.isActive,
    };

    if (this.editingSubtype()) {
      // Update existing subtype
      const subtypes = this.catalogSubtypes();
      const index = subtypes.findIndex(s => s.id === subtypeData.id);
      if (index >= 0) {
        subtypes[index] = subtypeData;
        this.catalogSubtypes.set([...subtypes]);
      }
      console.log('Updated subtype:', subtypeData);
    } else {
      // Create new subtype
      this.catalogSubtypes.update(subtypes => [...subtypes, subtypeData]);
      console.log('Created subtype:', subtypeData);
    }

    this.closeSubtypeModal();
  }

  editSubtype(subtype: CatalogSubtype): void {
    this.openSubtypeModal(subtype);
  }

  deleteSubtype(subtype: CatalogSubtype): void {
    if (confirm(`¿Está seguro de eliminar el subtipo "${subtype.name}"?`)) {
      this.catalogSubtypes.update(subtypes => subtypes.filter(s => s.id !== subtype.id));
      console.log('Deleted subtype:', subtype.id);
    }
  }

  // ============================================
  // User CRUD methods
  // ============================================

  openUserModal(user?: User): void {
    if (user) {
      this.editingUser.set(user);
      this.userForm = {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        password: '',
        confirmPassword: '',
        role: user.role,
        polygons: [...(user.polygons || [])],
        isActive: user.isActive,
      };
    } else {
      this.editingUser.set(null);
      this.resetUserForm();
    }
    this.userModalOpen.set(true);
  }

  closeUserModal(): void {
    this.userModalOpen.set(false);
    this.editingUser.set(null);
    this.resetUserForm();
  }

  resetUserForm(): void {
    this.userForm = {
      id: '',
      name: '',
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: 'operator',
      polygons: [],
      isActive: true,
    };
  }

  saveUser(): void {
    if (!this.userForm.name || !this.userForm.username || !this.userForm.email) {
      alert('Por favor complete los campos obligatorios: Nombre, Usuario y Email');
      return;
    }

    if (!this.editingUser() && (!this.userForm.password || this.userForm.password !== this.userForm.confirmPassword)) {
      alert('Las contraseñas no coinciden');
      return;
    }

    const userData: User = {
      id: this.editingUser() ? this.userForm.id : Date.now().toString(),
      name: this.userForm.name,
      username: this.userForm.username,
      email: this.userForm.email,
      role: this.userForm.role,
      polygons: this.userForm.polygons,
      isActive: this.userForm.isActive,
    };

    if (this.editingUser()) {
      const users = this.users();
      const index = users.findIndex(u => u.id === userData.id);
      if (index >= 0) {
        users[index] = { ...users[index], ...userData };
        this.users.set([...users]);
      }
      console.log('Updated user:', userData);
    } else {
      this.users.update(users => [...users, userData]);
      console.log('Created user:', userData);
    }

    this.closeUserModal();
  }

  editUser(user: User): void {
    this.openUserModal(user);
  }

  toggleUserStatus(user: User): void {
    const users = this.users();
    const index = users.findIndex(u => u.id === user.id);
    if (index >= 0) {
      users[index] = { ...users[index], isActive: !users[index].isActive };
      this.users.set([...users]);
      console.log('Toggled user status:', user.id, !user.isActive);
    }
  }

  deleteUser(user: User): void {
    if (confirm(`¿Está seguro de eliminar el usuario "${user.name}"?`)) {
      this.users.update(users => users.filter(u => u.id !== user.id));
      console.log('Deleted user:', user.id);
    }
  }

  toggleUserPolygon(polygonId: string): void {
    const idx = this.userForm.polygons.indexOf(polygonId);
    if (idx >= 0) {
      this.userForm.polygons.splice(idx, 1);
    } else {
      this.userForm.polygons.push(polygonId);
    }
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  }

  getAvatarColor(name: string): string {
    const colors = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }

  getRoleClass(roleId: string): string {
    const classes: Record<string, string> = {
      admin: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400',
      supervisor: 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
      operator: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400',
      viewer: 'bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400',
    };
    return classes[roleId] || 'bg-gray-100 text-gray-700';
  }

  getRoleName(roleId: string): string {
    const role = this.roles().find(r => r.id === roleId);
    return role?.name || roleId;
  }

  // ============================================
  // Role CRUD methods
  // ============================================

  openRoleModal(): void {
    this.editingRole.set(null);
    this.resetRoleForm();
    this.roleModalOpen.set(true);
  }

  closeRoleModal(): void {
    this.roleModalOpen.set(false);
    this.editingRole.set(null);
    this.resetRoleForm();
  }

  resetRoleForm(): void {
    this.roleForm = {
      id: '',
      name: '',
      description: '',
      color: '#8b5cf6',
      permissions: [],
    };
  }

  editRole(role: Role): void {
    this.editingRole.set(role);
    this.roleForm = {
      id: role.id,
      name: role.name,
      description: role.description,
      color: role.color,
      permissions: [...role.permissions],
    };
  }

  saveRole(): void {
    if (!this.roleForm.name) {
      alert('Por favor ingrese el nombre del rol');
      return;
    }

    const roleData: Role = {
      id: this.editingRole() ? this.roleForm.id : this.roleForm.name.toLowerCase().replace(/\s+/g, '_'),
      name: this.roleForm.name,
      description: this.roleForm.description,
      color: this.roleForm.color,
      permissions: this.roleForm.permissions,
      isSystem: false,
    };

    if (this.editingRole()) {
      const roles = this.roles();
      const index = roles.findIndex(r => r.id === roleData.id);
      if (index >= 0) {
        roles[index] = { ...roles[index], ...roleData, isSystem: roles[index].isSystem };
        this.roles.set([...roles]);
      }
      console.log('Updated role:', roleData);
    } else {
      this.roles.update(roles => [...roles, roleData]);
      console.log('Created role:', roleData);
    }

    this.resetRoleForm();
    this.editingRole.set(null);
  }

  deleteRole(role: Role): void {
    if (role.isSystem) {
      alert('No se pueden eliminar roles del sistema');
      return;
    }

    // Check if there are users with this role
    const usersWithRole = this.users().filter(u => u.role === role.id);
    if (usersWithRole.length > 0) {
      alert(`No se puede eliminar este rol porque hay ${usersWithRole.length} usuario(s) asignado(s).`);
      return;
    }

    if (confirm(`¿Está seguro de eliminar el rol "${role.name}"?`)) {
      this.roles.update(roles => roles.filter(r => r.id !== role.id));
      console.log('Deleted role:', role.id);
    }
  }

  toggleRolePermission(permId: string): void {
    const idx = this.roleForm.permissions.indexOf(permId);
    if (idx >= 0) {
      this.roleForm.permissions.splice(idx, 1);
    } else {
      this.roleForm.permissions.push(permId);
    }
  }
}
