# Database Audit Report

Date: 2025-12-30T04:21:10.477Z

## 1. Table Sizes

| Table Name | Size |
|------------|------|
| polygon_criticality_scores | 272 kB |
| polygon_weather_data | 120 kB |
| road_accidents | 112 kB |
| waze_jams | 104 kB |
| waze_alerts | 104 kB |
| polygon_snapshots | 104 kB |
| historical_snapshots | 96 kB |
| incident_subtypes | 96 kB |
| permissions | 80 kB |
| system_settings | 80 kB |
| incident_types | 80 kB |
| alerts | 64 kB |
| roles | 64 kB |
| incidents_history | 48 kB |
| users | 48 kB |
| role_permissions | 40 kB |
| daily_statistics | 32 kB |
| group_performance_daily | 32 kB |
| accident_media | 24 kB |
| polygon_metrics_timeseries | 24 kB |
| waze_irregularities | 24 kB |
| user_roles | 16 kB |
| audit_logs | 16 kB |
| sso_providers | 16 kB |
| historical_summary | 0 bytes |

## 2. Indexes

| Table | Index Name | Definition | Size |
|-------|------------|------------|------|
| polygon_criticality_scores | idx_criticality_group | `CREATE INDEX idx_criticality_group ON public.polygon_criticality_scores USING btree (group_name, calculated_at DESC)` | 40 kB |
| polygon_criticality_scores | polygon_criticality_scores_pkey | `CREATE UNIQUE INDEX polygon_criticality_scores_pkey ON public.polygon_criticality_scores USING btree (id)` | 40 kB |
| polygon_criticality_scores | idx_criticality_polygon | `CREATE INDEX idx_criticality_polygon ON public.polygon_criticality_scores USING btree (polygon_id, calculated_at DESC)` | 32 kB |
| polygon_snapshots | polygon_snapshots_pkey | `CREATE UNIQUE INDEX polygon_snapshots_pkey ON public.polygon_snapshots USING btree (id)` | 16 kB |
| polygon_snapshots | idx_polygon_snapshots_polygon_id | `CREATE INDEX idx_polygon_snapshots_polygon_id ON public.polygon_snapshots USING btree (polygon_id)` | 16 kB |
| polygon_snapshots | idx_polygon_snapshots_timestamp | `CREATE INDEX idx_polygon_snapshots_timestamp ON public.polygon_snapshots USING btree ("timestamp" DESC)` | 16 kB |
| polygon_snapshots | idx_polygon_snapshots_polygon_timestamp | `CREATE INDEX idx_polygon_snapshots_polygon_timestamp ON public.polygon_snapshots USING btree (polygon_id, "timestamp" DESC)` | 16 kB |
| system_settings | system_settings_category_key_key | `CREATE UNIQUE INDEX system_settings_category_key_key ON public.system_settings USING btree (category, key)` | 16 kB |
| historical_snapshots | idx_historical_snapshots_timestamp | `CREATE INDEX idx_historical_snapshots_timestamp ON public.historical_snapshots USING btree ("timestamp" DESC)` | 16 kB |
| historical_snapshots | idx_historical_snapshots_created_at | `CREATE INDEX idx_historical_snapshots_created_at ON public.historical_snapshots USING btree (created_at DESC)` | 16 kB |
| polygon_weather_data | polygon_weather_data_pkey | `CREATE UNIQUE INDEX polygon_weather_data_pkey ON public.polygon_weather_data USING btree (id)` | 16 kB |
| polygon_weather_data | idx_weather_polygon_time | `CREATE INDEX idx_weather_polygon_time ON public.polygon_weather_data USING btree (polygon_id, "timestamp" DESC)` | 16 kB |
| polygon_weather_data | idx_weather_timestamp | `CREATE INDEX idx_weather_timestamp ON public.polygon_weather_data USING btree ("timestamp" DESC)` | 16 kB |
| polygon_criticality_scores | idx_criticality_risk_level | `CREATE INDEX idx_criticality_risk_level ON public.polygon_criticality_scores USING btree (risk_level, final_risk_score DESC)` | 16 kB |
| polygon_criticality_scores | idx_criticality_calculated | `CREATE INDEX idx_criticality_calculated ON public.polygon_criticality_scores USING btree (calculated_at DESC)` | 16 kB |
| latest_polygon_risk_scores | idx_latest_risk_polygon | `CREATE UNIQUE INDEX idx_latest_risk_polygon ON public.latest_polygon_risk_scores USING btree (polygon_id)` | 16 kB |
| road_accidents | road_accidents_pkey | `CREATE UNIQUE INDEX road_accidents_pkey ON public.road_accidents USING btree (id)` | 16 kB |
| road_accidents | idx_road_accidents_incident_id | `CREATE INDEX idx_road_accidents_incident_id ON public.road_accidents USING btree (incident_id)` | 16 kB |
| road_accidents | idx_road_accidents_date | `CREATE INDEX idx_road_accidents_date ON public.road_accidents USING btree (accident_at DESC)` | 16 kB |
| road_accidents | idx_road_accidents_location | `CREATE INDEX idx_road_accidents_location ON public.road_accidents USING btree (location_lat, location_lng)` | 16 kB |
| incident_types | incident_types_pkey | `CREATE UNIQUE INDEX incident_types_pkey ON public.incident_types USING btree (id)` | 16 kB |
| incident_types | incident_types_code_key | `CREATE UNIQUE INDEX incident_types_code_key ON public.incident_types USING btree (code)` | 16 kB |
| incident_subtypes | incident_subtypes_pkey | `CREATE UNIQUE INDEX incident_subtypes_pkey ON public.incident_subtypes USING btree (id)` | 16 kB |
| incident_subtypes | incident_subtypes_type_id_code_key | `CREATE UNIQUE INDEX incident_subtypes_type_id_code_key ON public.incident_subtypes USING btree (type_id, code)` | 16 kB |
| permissions | permissions_pkey | `CREATE UNIQUE INDEX permissions_pkey ON public.permissions USING btree (id)` | 16 kB |
| permissions | permissions_code_key | `CREATE UNIQUE INDEX permissions_code_key ON public.permissions USING btree (code)` | 16 kB |
| roles | roles_pkey | `CREATE UNIQUE INDEX roles_pkey ON public.roles USING btree (id)` | 16 kB |
| roles | roles_name_key | `CREATE UNIQUE INDEX roles_name_key ON public.roles USING btree (name)` | 16 kB |
| role_permissions | role_permissions_pkey | `CREATE UNIQUE INDEX role_permissions_pkey ON public.role_permissions USING btree (id)` | 16 kB |
| role_permissions | role_permissions_role_id_permission_id_key | `CREATE UNIQUE INDEX role_permissions_role_id_permission_id_key ON public.role_permissions USING btree (role_id, permission_id)` | 16 kB |
| system_settings | system_settings_pkey | `CREATE UNIQUE INDEX system_settings_pkey ON public.system_settings USING btree (id)` | 16 kB |
| historical_snapshots | historical_snapshots_pkey | `CREATE UNIQUE INDEX historical_snapshots_pkey ON public.historical_snapshots USING btree (id)` | 16 kB |
| incident_types | idx_incident_types_code | `CREATE INDEX idx_incident_types_code ON public.incident_types USING btree (code)` | 16 kB |
| incident_types | idx_incident_types_active | `CREATE INDEX idx_incident_types_active ON public.incident_types USING btree (is_active)` | 16 kB |
| incident_subtypes | idx_incident_subtypes_type_id | `CREATE INDEX idx_incident_subtypes_type_id ON public.incident_subtypes USING btree (type_id)` | 16 kB |
| incident_subtypes | idx_incident_subtypes_code | `CREATE INDEX idx_incident_subtypes_code ON public.incident_subtypes USING btree (code)` | 16 kB |
| incident_subtypes | idx_incident_subtypes_active | `CREATE INDEX idx_incident_subtypes_active ON public.incident_subtypes USING btree (is_active)` | 16 kB |
| roles | idx_roles_active | `CREATE INDEX idx_roles_active ON public.roles USING btree (is_active)` | 16 kB |
| permissions | idx_permissions_category | `CREATE INDEX idx_permissions_category ON public.permissions USING btree (category)` | 16 kB |
| permissions | idx_permissions_active | `CREATE INDEX idx_permissions_active ON public.permissions USING btree (is_active)` | 16 kB |
| system_settings | idx_system_settings_category | `CREATE INDEX idx_system_settings_category ON public.system_settings USING btree (category)` | 16 kB |
| system_settings | idx_system_settings_key | `CREATE INDEX idx_system_settings_key ON public.system_settings USING btree (key)` | 16 kB |
| waze_alerts | waze_alerts_pkey | `CREATE UNIQUE INDEX waze_alerts_pkey ON public.waze_alerts USING btree (uuid)` | 16 kB |
| waze_jams | waze_jams_pkey | `CREATE UNIQUE INDEX waze_jams_pkey ON public.waze_jams USING btree (uuid)` | 16 kB |
| waze_alerts | idx_alerts_polygon | `CREATE INDEX idx_alerts_polygon ON public.waze_alerts USING btree (polygon_id, is_active, created_at DESC)` | 16 kB |
| waze_jams | idx_jams_polygon | `CREATE INDEX idx_jams_polygon ON public.waze_jams USING btree (polygon_id, is_active, created_at DESC)` | 16 kB |
| users | users_email_key | `CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email)` | 8192 bytes |
| alerts | idx_alerts_severity | `CREATE INDEX idx_alerts_severity ON public.alerts USING btree (severity)` | 8192 bytes |
| alerts | idx_alerts_is_acknowledged | `CREATE INDEX idx_alerts_is_acknowledged ON public.alerts USING btree (is_acknowledged)` | 8192 bytes |
| alerts | idx_alerts_created_at | `CREATE INDEX idx_alerts_created_at ON public.alerts USING btree (created_at DESC)` | 8192 bytes |
| alerts | idx_alerts_resolved | `CREATE INDEX idx_alerts_resolved ON public.alerts USING btree (resolved_at DESC) WHERE (resolved_at IS NOT NULL)` | 8192 bytes |
| incidents_history | incidents_history_pkey | `CREATE UNIQUE INDEX incidents_history_pkey ON public.incidents_history USING btree (id)` | 8192 bytes |
| incidents_history | idx_incidents_hist_polygon_date | `CREATE INDEX idx_incidents_hist_polygon_date ON public.incidents_history USING btree (polygon_id, first_seen_at DESC)` | 8192 bytes |
| incidents_history | idx_incidents_hist_type_date | `CREATE INDEX idx_incidents_hist_type_date ON public.incidents_history USING btree (type, first_seen_at DESC)` | 8192 bytes |
| incidents_history | idx_incidents_hist_duration | `CREATE INDEX idx_incidents_hist_duration ON public.incidents_history USING btree (duration_minutes DESC NULLS LAST)` | 8192 bytes |
| incidents_history | idx_incidents_hist_location | `CREATE INDEX idx_incidents_hist_location ON public.incidents_history USING btree (latitude, longitude)` | 8192 bytes |
| daily_statistics | daily_statistics_pkey | `CREATE UNIQUE INDEX daily_statistics_pkey ON public.daily_statistics USING btree (id)` | 8192 bytes |
| daily_statistics | daily_statistics_date_key | `CREATE UNIQUE INDEX daily_statistics_date_key ON public.daily_statistics USING btree (date)` | 8192 bytes |
| daily_statistics | idx_daily_stats_date | `CREATE INDEX idx_daily_stats_date ON public.daily_statistics USING btree (date DESC)` | 8192 bytes |
| polygon_metrics_timeseries | polygon_metrics_timeseries_pkey | `CREATE UNIQUE INDEX polygon_metrics_timeseries_pkey ON public.polygon_metrics_timeseries USING btree (id)` | 8192 bytes |
| polygon_metrics_timeseries | idx_metrics_polygon_time | `CREATE INDEX idx_metrics_polygon_time ON public.polygon_metrics_timeseries USING btree (polygon_id, "timestamp" DESC)` | 8192 bytes |
| polygon_metrics_timeseries | idx_metrics_timestamp | `CREATE INDEX idx_metrics_timestamp ON public.polygon_metrics_timeseries USING btree ("timestamp" DESC)` | 8192 bytes |
| group_performance_daily | group_performance_daily_pkey | `CREATE UNIQUE INDEX group_performance_daily_pkey ON public.group_performance_daily USING btree (id)` | 8192 bytes |
| group_performance_daily | group_performance_daily_group_name_date_key | `CREATE UNIQUE INDEX group_performance_daily_group_name_date_key ON public.group_performance_daily USING btree (group_name, date)` | 8192 bytes |
| group_performance_daily | idx_group_perf_date | `CREATE INDEX idx_group_perf_date ON public.group_performance_daily USING btree (date DESC)` | 8192 bytes |
| group_performance_daily | idx_group_perf_name_date | `CREATE INDEX idx_group_perf_name_date ON public.group_performance_daily USING btree (group_name, date DESC)` | 8192 bytes |
| user_roles | user_roles_pkey | `CREATE UNIQUE INDEX user_roles_pkey ON public.user_roles USING btree (id)` | 8192 bytes |
| user_roles | user_roles_user_id_role_id_key | `CREATE UNIQUE INDEX user_roles_user_id_role_id_key ON public.user_roles USING btree (user_id, role_id)` | 8192 bytes |
| sso_providers | sso_providers_pkey | `CREATE UNIQUE INDEX sso_providers_pkey ON public.sso_providers USING btree (id)` | 8192 bytes |
| polygon_weather_data | idx_weather_freezing_risk | `CREATE INDEX idx_weather_freezing_risk ON public.polygon_weather_data USING btree (is_freezing_risk) WHERE (is_freezing_risk = true)` | 8192 bytes |
| polygon_weather_data | idx_weather_alerts | `CREATE INDEX idx_weather_alerts ON public.polygon_weather_data USING btree (has_weather_alert) WHERE (has_weather_alert = true)` | 8192 bytes |
| alerts | idx_alerts_polygon_id | `CREATE INDEX idx_alerts_polygon_id ON public.alerts USING btree (polygon_id)` | 8192 bytes |
| alerts | alerts_alert_id_key | `CREATE UNIQUE INDEX alerts_alert_id_key ON public.alerts USING btree (alert_id)` | 8192 bytes |
| alerts | alerts_pkey | `CREATE UNIQUE INDEX alerts_pkey ON public.alerts USING btree (id)` | 8192 bytes |
| waze_irregularities | idx_irreg_polygon | `CREATE INDEX idx_irreg_polygon ON public.waze_irregularities USING btree (polygon_id, is_active, created_at DESC)` | 8192 bytes |
| waze_irregularities | waze_irregularities_pkey | `CREATE UNIQUE INDEX waze_irregularities_pkey ON public.waze_irregularities USING btree (uuid)` | 8192 bytes |
| audit_logs | audit_logs_pkey | `CREATE UNIQUE INDEX audit_logs_pkey ON public.audit_logs USING btree (id)` | 8192 bytes |
| users | idx_users_email | `CREATE INDEX idx_users_email ON public.users USING btree (email)` | 8192 bytes |
| users | idx_users_active | `CREATE INDEX idx_users_active ON public.users USING btree (is_active)` | 8192 bytes |
| users | idx_users_email_verified | `CREATE INDEX idx_users_email_verified ON public.users USING btree (email_verified)` | 8192 bytes |
| users | users_pkey | `CREATE UNIQUE INDEX users_pkey ON public.users USING btree (id)` | 8192 bytes |
| accident_media | accident_media_pkey | `CREATE UNIQUE INDEX accident_media_pkey ON public.accident_media USING btree (id)` | 8192 bytes |
| accident_media | idx_accident_media_accident | `CREATE INDEX idx_accident_media_accident ON public.accident_media USING btree (accident_id)` | 8192 bytes |

## 3. Tables/Columns with Missing FK Indexes

- Table: **user_roles**, Column: **assigned_by**
- Table: **audit_logs**, Column: **user_id**

## 4. Tables without Primary Key

✅ All tables have Primary Keys.

## 5. Potentially Inefficient Columns

- **alerts.message**: text()
- **incident_types.description**: text()
- **incident_subtypes.description**: text()
- **polygon_weather_data.alert_description**: text()
- **roles.description**: text()
- **permissions.description**: text()
- **polygon_criticality_scores.alert_message**: text()
- **road_accidents.operator_notes**: text()
- **audit_logs.user_agent**: text()
- **sso_providers.redirect_uri**: text()
- **sso_providers.authorization_url**: text()
- **sso_providers.token_url**: text()
- **sso_providers.user_info_url**: text()
- **sso_providers.scopes**: text()
- **system_settings.value**: text()
- **system_settings.description**: text()
- **waze_alerts.report_description**: text()

## 6. Tables without `updated_at`

- historical_snapshots
- polygon_snapshots
- incidents_history
- daily_statistics
- polygon_metrics_timeseries
- group_performance_daily
- polygon_weather_data
- role_permissions
- permissions
- polygon_criticality_scores
- accident_media
- user_roles
- audit_logs
- waze_jams
- waze_irregularities

