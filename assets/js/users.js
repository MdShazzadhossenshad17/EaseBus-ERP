/**
 * EaseBus — Real-Time Users & Staff Management & Creator Control Center UI Module
 */

window.Users = {
    usersData: [],
    rolesData: [
        { id: 1, name: 'admin', display_name: 'Administrator' },
        { id: 2, name: 'manager', display_name: 'Store Manager' },
        { id: 3, name: 'sales', display_name: 'Sales Representative' },
        { id: 4, name: 'accountant', display_name: 'Staff Accountant' }
    ],
    searchTimeout: null,

    isCreator() {
        const u = API.getCurrentUser();
        return u && (u.role === 'creator' || u.username === 'shad@dbms.com' || u.email === 'shad@dbms.com');
    },

    isOwner() {
        const u = API.getCurrentUser() || {};
        return typeof window.isStoreOwner === 'function' ? window.isStoreOwner(u) : (u.username === 'hisham' || u.role === 'creator');
    },

    activeTab: 'directory',
    liveInterval: null,

    stopLivePolling() {
        if (this.liveInterval) {
            clearInterval(this.liveInterval);
            this.liveInterval = null;
        }
    },

    startLivePolling() {
        this.stopLivePolling();
        this.liveInterval = setInterval(() => {
            if (document.getElementById('user-list') || document.getElementById('attendance-matrix-container')) {
                this.loadUsers(true);
            } else {
                this.stopLivePolling();
            }
        }, 3000);
    },

    switchTab(tab) {
        this.activeTab = tab;
        const btnDir = document.getElementById('users-tab-dir');
        const btnAtt = document.getElementById('users-tab-att');
        const viewDir = document.getElementById('users-view-directory');
        const viewAtt = document.getElementById('users-view-attendance');

        if (tab === 'directory') {
            btnDir?.classList.add('bg-blue-600', 'text-white');
            btnDir?.classList.remove('bg-slate-900', 'text-slate-400');
            btnAtt?.classList.add('bg-slate-900', 'text-slate-400');
            btnAtt?.classList.remove('bg-blue-600', 'text-white');
            viewDir?.classList.remove('hidden');
            viewAtt?.classList.add('hidden');
        } else {
            btnAtt?.classList.add('bg-blue-600', 'text-white');
            btnAtt?.classList.remove('bg-slate-900', 'text-slate-400');
            btnDir?.classList.add('bg-slate-900', 'text-slate-400');
            btnDir?.classList.remove('bg-blue-600', 'text-white');
            viewAtt?.classList.remove('hidden');
            viewDir?.classList.add('hidden');
            this.renderAttendanceMatrix();
        }
    },

    isOnlineNow(user) {
        if (!user) return false;
        const currentUser = API.getCurrentUser();
        const currentUname = (currentUser?.username || '').toLowerCase();
        const targetUname = (user.username || '').toLowerCase();
        
        // Target is ONLY Online Now if they are the currently logged in active session user OR logged in within 5 minutes
        if (currentUname && currentUname === targetUname) return true;
        if (user.last_login_at) {
            const lastLoginTime = new Date(user.last_login_at).getTime();
            const fiveMinsAgo = Date.now() - (5 * 60 * 1000);
            return lastLoginTime > fiveMinsAgo;
        }
        return false;
    },

    attendanceOverrides: JSON.parse(localStorage.getItem('easebus_attendance_overrides') || '{}'),

    getAttendanceForMonth(user, year = 2026, month = 7) {
        if (!this.attendanceOverrides) {
            this.attendanceOverrides = JSON.parse(localStorage.getItem('easebus_attendance_overrides') || '{}');
        }

        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const records = [];
        let presentCount = 0;
        let lateCount = 0;
        let absentCount = 0;
        let weekendCount = 0;
        let workingDaysCount = 0;

        const currentDay = new Date().getDate();
        const isOnline = this.isOnlineNow(user);

        for (let d = 1; d <= daysInMonth; d++) {
            const key = `${user.id}_${year}_${month}_${d}`;
            const override = this.attendanceOverrides[key];
            const date = new Date(year, month, d);
            const dayOfWeek = date.getDay(); // 0 = Sun, 5 = Fri, 6 = Sat
            const isWeekend = (dayOfWeek === 5 || dayOfWeek === 6);

            if (override) {
                const st = override.status;
                let col = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 font-bold';
                if (st === 'L') col = 'bg-amber-500/20 text-amber-300 border-amber-500/30 font-bold';
                else if (st === 'OFF') col = 'bg-slate-800 text-slate-400 border-slate-700 font-bold';
                else if (st === 'A') col = 'bg-red-500/20 text-red-300 border-red-500/30 font-bold';
                else if (st === 'LEAVE') col = 'bg-purple-500/20 text-purple-300 border-purple-500/30 font-bold';

                records.push({ day: d, status: st, label: `Manually Set: ${st} (${override.notes || 'No remarks'})`, color: col, isOverride: true });
                if (st === 'P' || st === 'L') presentCount++;
                if (st === 'L') lateCount++;
                if (st === 'A') absentCount++;
                if (st === 'OFF') weekendCount++;
                if (st !== 'OFF') workingDaysCount++;
            } else if (isWeekend) {
                records.push({ day: d, status: 'OFF', label: 'Weekend Off Day (Friday / Saturday)', color: 'bg-slate-800 text-slate-400 border-slate-700 font-bold' });
                weekendCount++;
            } else {
                workingDaysCount++;
                if (d < currentDay) {
                    if (isOnline || user.last_login_at) {
                        records.push({ day: d, status: 'P', label: 'Present (09:00 AM On Time)', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 font-bold' });
                        presentCount++;
                    } else {
                        records.push({ day: d, status: 'A', label: 'Absent (No Login)', color: 'bg-red-500/20 text-red-300 border-red-500/30 font-bold' });
                        absentCount++;
                    }
                } else if (d === currentDay) {
                    if (isOnline) {
                        records.push({ day: d, status: 'P', label: 'Present & Working Logged In Now', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 font-bold animate-pulse' });
                        presentCount++;
                    } else {
                        records.push({ day: d, status: 'A', label: 'Offline / Not Logged In Today', color: 'bg-red-500/20 text-red-300 border-red-500/30 font-bold' });
                        absentCount++;
                    }
                } else {
                    records.push({ day: d, status: '-', label: 'Upcoming Day', color: 'bg-slate-950/40 text-slate-600 border-slate-800' });
                }
            }
        }

        const attendanceRate = workingDaysCount > 0 ? ((presentCount / workingDaysCount) * 100).toFixed(1) : '0.0';

        return {
            records,
            presentCount,
            lateCount,
            absentCount,
            weekendCount,
            workingDaysCount,
            attendanceRate
        };
    },

    renderAttendanceMatrix() {
        const container = document.getElementById('attendance-matrix-container');
        if (!container) return;

        const users = this.usersData || [];
        const days = Array.from({ length: 31 }, (_, i) => i + 1);

        container.innerHTML = `
            <div class="card p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl font-jakarta">
                <!-- Matrix Controls & Legend Header -->
                <div class="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-4">
                    <div>
                        <h3 class="text-lg font-bold text-white font-geist flex items-center gap-2">
                            <span class="material-symbols-outlined text-blue-400">calendar_month</span> Monthly Staff Attendance Roster (August 2026)
                        </h3>
                        <p class="text-xs text-slate-400 font-inter mt-1">Automatic shift log • Click any day cell to edit attendance • Off Days: <span class="text-indigo-300 font-bold">Friday & Saturday</span></p>
                    </div>
                    <div class="flex flex-wrap items-center gap-2 font-outfit text-xs">
                        <span class="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-emerald-400"></span> P = Present</span>
                        <span class="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-amber-400"></span> L = Late</span>
                        <span class="px-2.5 py-1 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-purple-400"></span> LEAVE = Leave</span>
                        <span class="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-400 border border-slate-700 font-bold flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-slate-500"></span> OFF = Fri/Sat</span>
                        <span class="px-2.5 py-1 rounded-lg bg-red-500/20 text-red-300 border border-red-500/30 font-bold flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-red-400"></span> A = Absent</span>
                    </div>
                </div>

                <!-- Matrix Table -->
                <div class="overflow-x-auto border border-slate-800 rounded-xl">
                    <table class="w-full text-left text-xs font-inter border-collapse">
                        <thead>
                            <tr class="bg-slate-950 text-slate-400 font-outfit border-b border-slate-800">
                                <th class="p-3 font-bold min-w-[160px] sticky left-0 bg-slate-950 z-10 border-r border-slate-800">Staff Member</th>
                                <th class="p-3 font-bold min-w-[120px]">Role</th>
                                ${days.map(d => `<th class="p-1 text-center font-bold min-w-[28px] border-r border-slate-800/60">${d}</th>`).join('')}
                                <th class="p-3 text-center font-bold min-w-[90px]">Attendance %</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-800/60">
                            ${users.map(u => {
                                const att = this.getAttendanceForMonth(u, 2026, 7);
                                const roleDisplay = u.role_name ? (u.role_name.charAt(0).toUpperCase() + u.role_name.slice(1)) : 'Staff';
                                return `
                                    <tr class="hover:bg-slate-800/40 transition-colors">
                                        <td class="p-3 font-bold text-white sticky left-0 bg-slate-900 border-r border-slate-800 flex items-center gap-2">
                                            <div class="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 font-outfit">
                                                ${(u.full_name || u.username || 'U').charAt(0).toUpperCase()}
                                            </div>
                                            <span class="truncate">${u.full_name || u.username}</span>
                                        </td>
                                        <td class="p-3 text-slate-300 font-outfit text-[11px]">${roleDisplay}</td>
                                        ${att.records.map(r => `
                                            <td class="p-0.5 text-center border-r border-slate-800/60 cursor-pointer hover:bg-slate-800/80 transition-all group" onclick="Users.showEditAttendanceModal(${u.id}, ${r.day}, 2026, 7)" title="Click to edit Day ${r.day}: ${r.label}">
                                                <span class="inline-block w-6 h-6 leading-6 text-[10px] rounded-md border ${r.color} group-hover:scale-110 transition-transform">
                                                    ${r.status}
                                                </span>
                                            </td>
                                        `).join('')}
                                        <td class="p-3 text-center font-bold font-mono text-emerald-400">
                                            ${att.attendanceRate}%
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    showEditAttendanceModal(userId, day, year = 2026, month = 7) {
        const u = this.usersData.find(user => user.id == userId);
        if (!u) return;

        const key = `${userId}_${year}_${month}_${day}`;
        const existing = (this.attendanceOverrides && this.attendanceOverrides[key]) || {};
        const attData = this.getAttendanceForMonth(u, year, month);
        const currentRec = attData.records.find(r => r.day === day) || {};
        const currentStatus = existing.status || currentRec.status || 'P';

        let modal = document.getElementById('edit-attendance-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'edit-attendance-modal';
            modal.className = 'fixed inset-0 modal-overlay z-50 flex items-center justify-center p-4 font-jakarta';
            document.body.appendChild(modal);
        }

        modal.innerHTML = `
            <div class="bg-slate-900 text-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-800 animate-fade-in font-jakarta">
                <div class="p-5 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950/60 border-b border-slate-800 flex justify-between items-center">
                    <div class="flex items-center gap-2">
                        <span class="material-symbols-outlined text-blue-400">edit_calendar</span>
                        <h3 class="font-bold text-base text-white font-geist">Edit Attendance — Day ${day} Aug ${year}</h3>
                    </div>
                    <button type="button" class="text-slate-400 hover:text-white rounded-lg p-1 cursor-pointer" onclick="document.getElementById('edit-attendance-modal').remove()">
                        <span class="material-symbols-outlined text-lg">close</span>
                    </button>
                </div>

                <div class="p-6 space-y-4 font-inter">
                    <div class="p-3.5 bg-slate-950 rounded-xl border border-slate-800 flex items-center gap-3">
                        <div class="w-10 h-10 rounded-xl bg-blue-600 text-white font-bold text-sm flex items-center justify-center font-outfit">
                            ${(u.full_name || u.username || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h4 class="font-bold text-white text-xs font-jakarta">${u.full_name || u.username}</h4>
                            <p class="text-[11px] text-slate-400 font-mono">@${u.username} • Day ${day} August ${year}</p>
                        </div>
                    </div>

                    <div>
                        <label class="form-label text-xs font-semibold text-slate-300">Attendance Status *</label>
                        <select id="att-status-input" class="form-input text-xs py-2 bg-slate-950 border-slate-800 text-white font-bold font-outfit">
                            <option value="P" ${currentStatus === 'P' ? 'selected' : ''}>P — Present (09:00 AM On Time)</option>
                            <option value="L" ${currentStatus === 'L' ? 'selected' : ''}>L — Late Arrival (e.g. 09:15 AM)</option>
                            <option value="OFF" ${currentStatus === 'OFF' ? 'selected' : ''}>OFF — Official Weekend / Off Day</option>
                            <option value="A" ${currentStatus === 'A' ? 'selected' : ''}>A — Absent / Unexcused</option>
                            <option value="LEAVE" ${currentStatus === 'LEAVE' ? 'selected' : ''}>LEAVE — Approved Paid/Unpaid Leave</option>
                        </select>
                    </div>

                    <div>
                        <label class="form-label text-xs font-semibold text-slate-300">Shift Notes / Remarks</label>
                        <input type="text" id="att-notes-input" class="form-input text-xs py-2 bg-slate-950 border-slate-800 text-white" value="${existing.notes || ''}" placeholder="e.g. Approved leave by Store Owner, Traffic delay">
                    </div>

                    <div class="pt-4 border-t border-slate-800 flex justify-end gap-3 font-outfit">
                        <button type="button" class="btn text-xs px-4 py-2 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 cursor-pointer" onclick="document.getElementById('edit-attendance-modal').remove()">
                            Cancel
                        </button>
                        <button type="button" class="btn text-xs font-bold px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-lg border border-blue-400/30 cursor-pointer" onclick="Users.saveAttendanceStatus(${userId}, ${day}, ${year}, ${month})">
                            Save Attendance
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    saveAttendanceStatus(userId, day, year, month) {
        const status = document.getElementById('att-status-input')?.value || 'P';
        const notes = document.getElementById('att-notes-input')?.value || '';
        const key = `${userId}_${year}_${month}_${day}`;

        if (!this.attendanceOverrides) this.attendanceOverrides = {};
        this.attendanceOverrides[key] = { status, notes, updated_at: new Date().toISOString() };
        localStorage.setItem('easebus_attendance_overrides', JSON.stringify(this.attendanceOverrides));

        document.getElementById('edit-attendance-modal')?.remove();
        UI.toast(`Attendance updated for Day ${day} to: ${status}`);
        this.renderAttendanceMatrix();
    },

    async render(container) {
        if (this.isCreator()) {
            await this.renderCreatorPortal(container);
            return;
        }

        const isOwner = this.isOwner();

        container.innerHTML = `
            <!-- Page Header -->
            <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 font-jakarta">
                <div>
                    <h1 class="text-2xl font-bold text-white tracking-tight">${isOwner ? 'Store Owner & Staff Management' : 'Store Staff & Management Directory'}</h1>
                    <p class="text-slate-400 text-xs mt-1 font-inter">${isOwner ? 'Real-time staff stream, attendance roster, and employee access permissions.' : 'Read-only staff directory & monthly shift roster. Modifying credentials requires Store Owner (hisham) permission.'}</p>
                </div>
                <div class="flex items-center gap-3 font-outfit">
                    <div class="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center gap-1">
                        <button onclick="Users.switchTab('directory')" id="users-tab-dir" class="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-blue-600 text-white shadow-sm flex items-center gap-1.5 transition-all cursor-pointer">
                            <span class="material-symbols-outlined text-sm">badge</span> Live Staff Directory
                        </button>
                        <button onclick="Users.switchTab('attendance')" id="users-tab-att" class="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-slate-900 text-slate-400 hover:text-white flex items-center gap-1.5 transition-all cursor-pointer">
                            <span class="material-symbols-outlined text-sm">event_available</span> Monthly Attendance Roster
                        </button>
                    </div>

                    ${isOwner ? `
                        <button class="btn btn-primary flex items-center gap-2 shadow-md bg-blue-600 hover:bg-blue-500 font-outfit font-bold text-xs py-2 px-4 border border-blue-400/30 cursor-pointer" onclick="Users.showModal()">
                            <span class="material-symbols-outlined text-sm">person_add</span> Add New Staff
                        </button>
                    ` : `
                        <button class="btn font-outfit font-bold text-xs py-2 px-4 bg-slate-800 text-amber-400 border border-amber-500/30 rounded-xl flex items-center gap-2 cursor-pointer shadow-md" onclick="Users.showOwnerPermissionNotice()">
                            <span class="material-symbols-outlined text-sm text-amber-400">lock</span> Read-Only (Owner Approval Required)
                        </button>
                    `}
                </div>
            </div>

            <!-- View 1: Directory -->
            <div id="users-view-directory" class="space-y-6">
                <!-- Top KPI Cards -->
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 font-jakarta" id="users-kpi-container">
                    <div class="card p-5 bg-slate-900/90 border border-slate-800 border-l-4 border-l-blue-500 shadow-xl rounded-2xl">
                        <div class="flex justify-between items-start">
                            <div>
                                <p class="text-[11px] font-bold uppercase tracking-wider text-blue-400 font-outfit">Store Owner & Staff</p>
                                <h3 class="text-3xl font-extrabold text-white mt-1.5 font-digit" id="kpi-total-users">--</h3>
                                <p class="text-xs text-slate-400 mt-1 font-inter">Registered staff accounts</p>
                            </div>
                            <div class="p-3 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
                                <span class="material-symbols-outlined text-2xl">group</span>
                            </div>
                        </div>
                    </div>

                    <div class="card p-5 bg-slate-900/90 border border-slate-800 border-l-4 border-l-indigo-500 shadow-xl rounded-2xl">
                        <div class="flex justify-between items-start">
                            <div>
                                <p class="text-[11px] font-bold uppercase tracking-wider text-indigo-400 font-outfit">Store Owners & Managers</p>
                                <h3 class="text-3xl font-extrabold text-indigo-400 mt-1.5 font-digit" id="kpi-active-admins">--</h3>
                                <p class="text-xs text-slate-400 mt-1 font-inter">Store management privilege</p>
                            </div>
                            <div class="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
                                <span class="material-symbols-outlined text-2xl">shield_person</span>
                            </div>
                        </div>
                    </div>

                    <div class="card p-5 bg-slate-900/90 border border-slate-800 border-l-4 border-l-emerald-500 shadow-xl rounded-2xl">
                        <div class="flex justify-between items-start">
                            <div>
                                <p class="text-[11px] font-bold uppercase tracking-wider text-emerald-400 font-outfit">Active Staff Operators</p>
                                <h3 class="text-3xl font-extrabold text-emerald-400 mt-1.5 font-digit" id="kpi-active-staff">--</h3>
                                <p class="text-xs text-slate-400 mt-1 font-inter">Store managers & sales staff</p>
                            </div>
                            <div class="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
                                <span class="material-symbols-outlined text-2xl">verified_user</span>
                            </div>
                        </div>
                    </div>

                    <div class="card p-5 bg-slate-900/90 border border-slate-800 border-l-4 border-l-amber-500 shadow-xl rounded-2xl">
                        <div class="flex justify-between items-start">
                            <div>
                                <p class="text-[11px] font-bold uppercase tracking-wider text-amber-400 font-outfit">Shift Schedule</p>
                                <h3 class="text-xl font-bold text-amber-300 mt-1.5 font-outfit">09:00 AM Daily</h3>
                                <p class="text-xs text-slate-400 mt-1 font-inter">Fri & Sat Official Off Days</p>
                            </div>
                            <div class="p-3 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
                                <span class="material-symbols-outlined text-2xl">schedule</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Filters & Staff Table Container -->
                <div class="card shadow-xl border border-slate-800 bg-slate-900/90 rounded-2xl overflow-hidden font-jakarta">
                    <div class="p-4 border-b border-slate-800 bg-slate-950/60 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
                        <div class="relative flex-1 max-w-md font-inter">
                            <span class="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-sm">search</span>
                            <input type="text" id="user-search" placeholder="Search by staff name, username, email, phone..." class="form-input pl-9 text-xs py-2 bg-slate-950 border-slate-800 text-white" onkeyup="Users.debounceSearch()">
                        </div>

                        <div class="flex items-center gap-3 font-outfit">
                            <select id="filter-role" class="form-input text-xs py-2 w-36 bg-slate-950 border-slate-800 text-white font-bold" onchange="Users.filterUsers()">
                                <option value="all">All Staff Roles</option>
                                <option value="admin">Store Owner</option>
                                <option value="manager">Store Manager</option>
                                <option value="sales">Sales Staff</option>
                                <option value="accountant">Staff Accountant</option>
                            </select>

                            <select id="filter-status" class="form-input text-xs py-2 w-36" onchange="Users.filterUsers()">
                                <option value="all">All Status</option>
                                <option value="active">Active Only</option>
                                <option value="inactive">Inactive Only</option>
                            </select>
                        </div>
                    </div>

                    <div class="overflow-x-auto">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Staff Member</th>
                                    <th>Contact Information</th>
                                    <th>Security Role</th>
                                    <th>Account Status</th>
                                    <th>Live Status</th>
                                    <th>Last Login</th>
                                    <th class="text-right">Manage</th>
                                </tr>
                            </thead>
                            <tbody id="user-list">
                                <tr><td colspan="7" class="text-center py-8 text-slate-400 text-xs">Loading staff accounts...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- View 2: Monthly Attendance Roster (Hidden by default) -->
            <div id="users-view-attendance" class="hidden">
                <div id="attendance-matrix-container"></div>
            </div>

            <!-- Modal Container -->
            <div id="user-modal" class="fixed inset-0 modal-overlay z-50 hidden flex items-center justify-center p-4"></div>
        `;

        await this.loadRoles();
        await this.loadUsers();
        this.startLivePolling();
    },

    async renderCreatorPortal(container) {
        let summary = { users: [], platform_totals: { total_stores: 1, total_orders: 0, total_products: 0, total_revenue: 0 } };
        let tickets = [];
        let diag = { db_status: 'Healthy', memory_usage: '3.5 MB', open_issues: 0, php_version: '8.2', pwa_version: 'v21.0' };

        try {
            const res = await API.request('users/creator_summary');
            if (res && res.data) summary = res.data;
            const diagRes = await API.get('support/health_diagnostics');
            if (diagRes && diagRes.data) diag = diagRes.data.diagnostics || diag;
            const tRes = await API.get('support/list');
            if (tRes && tRes.data) tickets = tRes.data.tickets || [];
        } catch(e) {}

        const totals = summary.platform_totals || {};
        const users = summary.users || [];

        container.innerHTML = `
            <!-- Creator Special Header Banner -->
            <div class="mb-8 p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl shadow-xl border border-indigo-500/30 relative overflow-hidden font-jakarta">
                <div class="absolute right-0 top-0 translate-x-4 -translate-y-4 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
                <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
                    <div>
                        <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/10 text-amber-300 border border-amber-400/30 text-xs font-semibold mb-3 font-outfit">
                            <span class="material-symbols-outlined text-sm">shield_person</span> Platform Creator Control Center
                        </div>
                        <h1 class="text-2xl font-bold tracking-tight">Welcome, Md Shazzad Hossen Shad</h1>
                        <p class="text-slate-300 text-xs mt-1 font-inter">Platform Creator & Super Admin: <code class="text-amber-300 font-mono">shad@dbms.com</code> • Complete live visibility over platform health, store tickets, & database diagnostics.</p>
                    </div>
                </div>
            </div>

            <!-- Creator Health Diagnostics Metric Cards -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8 font-jakarta">
                <div class="card p-5 bg-slate-900/90 border border-slate-800 border-l-4 border-l-emerald-500 shadow-xl rounded-2xl">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="text-[11px] font-bold uppercase tracking-wider text-emerald-400 font-outfit">Database Health</p>
                            <h3 class="text-xl font-bold text-white mt-1.5 font-geist">${diag.db_status || 'Healthy'}</h3>
                            <p class="text-xs text-slate-400 mt-1 font-inter">Memory: ${diag.memory_usage || '3.5 MB'}</p>
                        </div>
                        <div class="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
                            <span class="material-symbols-outlined text-2xl">dns</span>
                        </div>
                    </div>
                </div>

                <div class="card p-5 bg-slate-900/90 border border-slate-800 border-l-4 border-l-amber-500 shadow-xl rounded-2xl">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="text-[11px] font-bold uppercase tracking-wider text-amber-400 font-outfit">Open Store Tickets</p>
                            <h3 class="text-3xl font-extrabold text-amber-300 mt-1.5 font-digit">${tickets.filter(t => t.status === 'open').length}</h3>
                            <p class="text-xs text-slate-400 mt-1 font-inter">Direct store owner bug reports</p>
                        </div>
                        <div class="p-3 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
                            <span class="material-symbols-outlined text-2xl">bug_report</span>
                        </div>
                    </div>
                </div>

                <div class="card p-5 bg-slate-900/90 border border-slate-800 border-l-4 border-l-blue-500 shadow-xl rounded-2xl">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="text-[11px] font-bold uppercase tracking-wider text-blue-400 font-outfit">Registered Stores</p>
                            <h3 class="text-3xl font-extrabold text-blue-400 mt-1.5 font-digit">${totals.total_stores || users.length}</h3>
                            <p class="text-xs text-slate-400 mt-1 font-inter">Active business deployments</p>
                        </div>
                        <div class="p-3 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
                            <span class="material-symbols-outlined text-2xl">store</span>
                        </div>
                    </div>
                </div>

                <div class="card p-5 bg-slate-900/90 border border-slate-800 border-l-4 border-l-purple-500 shadow-xl rounded-2xl">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="text-[11px] font-bold uppercase tracking-wider text-purple-400 font-outfit">PWA Engine Version</p>
                            <h3 class="text-lg font-bold text-white mt-1.5 font-mono">${diag.pwa_version || 'v21.0'}</h3>
                            <p class="text-xs text-slate-400 mt-1 font-inter">PHP ${diag.php_version || '8.2'}</p>
                        </div>
                        <div class="p-3 bg-purple-500/10 text-purple-400 rounded-xl border border-purple-500/20">
                            <span class="material-symbols-outlined text-2xl">layers</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Real-Time User Support Tickets & Reported Issues Stream -->
            <div class="card p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl font-jakarta mb-8">
                <div class="flex justify-between items-center mb-4 border-b border-slate-800 pb-3">
                    <div>
                        <h3 class="text-lg font-bold text-white font-geist flex items-center gap-2">
                            <span class="material-symbols-outlined text-amber-400">bug_report</span> Live Store Reported Issues & Support Stream
                        </h3>
                        <p class="text-xs text-slate-400 font-inter">Real-time bug reports & feature requests submitted directly by store owners & users to Creator (<span class="font-bold text-amber-300">shad@dbms.com</span>).</p>
                    </div>
                    <span class="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 font-outfit">
                        ${tickets.filter(t => t.status === 'open').length} Open Reports
                    </span>
                </div>

                <div class="overflow-x-auto border border-slate-800 rounded-xl">
                    <table class="w-full text-left text-xs font-inter border-collapse">
                        <thead>
                            <tr class="bg-slate-950 text-slate-400 font-outfit border-b border-slate-800">
                                <th class="p-3 font-bold">Store / User</th>
                                <th class="p-3 font-bold">Category</th>
                                <th class="p-3 font-bold">Subject & Details</th>
                                <th class="p-3 font-bold text-center">Priority</th>
                                <th class="p-3 font-bold text-center">Status</th>
                                <th class="p-3 font-bold text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-800/60">
                            ${tickets.length === 0 ? `<tr><td colspan="6" class="text-center py-8 text-slate-400 text-xs">No store issues or bug reports submitted yet. Everything is healthy!</td></tr>` : 
                            tickets.map(t => `
                                <tr class="hover:bg-slate-800/40 transition-colors">
                                    <td class="p-3 font-bold text-white">
                                        <div>${t.store_name || 'eloria'}</div>
                                        <div class="text-[10px] text-slate-400 font-mono">@${t.username} • ${t.email || '-'}</div>
                                    </td>
                                    <td class="p-3">
                                        <span class="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 font-outfit">${t.category}</span>
                                    </td>
                                    <td class="p-3 max-w-xs">
                                        <div class="font-bold text-slate-200 truncate">${t.subject}</div>
                                        <div class="text-[11px] text-slate-400 line-clamp-2 mt-0.5">${t.description}</div>
                                    </td>
                                    <td class="p-3 text-center font-bold">
                                        <span class="px-2 py-0.5 rounded text-[10px] uppercase ${t.priority === 'Urgent' ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 'bg-slate-800 text-slate-300'}">${t.priority}</span>
                                    </td>
                                    <td class="p-3 text-center font-bold font-outfit">
                                        <span class="px-2.5 py-1 rounded-full text-[10px] uppercase ${t.status === 'resolved' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse'}">${t.status}</span>
                                    </td>
                                    <td class="p-3 text-right">
                                        <button class="btn text-xs px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-outfit font-bold cursor-pointer" onclick="Users.showCreatorTicketResponseModal(${t.id}, '${t.status}', '${(t.response || '').replace(/'/g, "\\'")}')">
                                            Respond & Resolve
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Platform Users Directory Table -->
            <div class="card shadow-sm border border-slate-200 bg-white overflow-hidden mb-8">
                <div class="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                    <div>
                        <h3 class="font-geist font-bold text-base text-slate-900">Platform Users & Store Directory</h3>
                        <p class="text-xs text-slate-500">Click any user row or "Inspect Data" button to view that user's full business information & database records.</p>
                    </div>
                </div>

                <div class="overflow-x-auto">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>User Account & Store</th>
                                <th>Email / Username</th>
                                <th>Role</th>
                                <th class="text-center">Products</th>
                                <th class="text-center">Orders</th>
                                <th class="text-right">Total Revenue</th>
                                <th class="text-right">Manage & Inspect</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${users.map(u => `
                                <tr class="hover:bg-slate-50/80 cursor-pointer">
                                    <td class="py-3">
                                        <div class="flex items-center gap-3">
                                            <div class="w-9 h-9 rounded-xl bg-slate-800 text-white flex items-center justify-center font-bold text-xs font-mono shadow-sm">
                                                ${(u.full_name || u.username || 'U').charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <div class="font-bold text-slate-900 text-xs">${u.business_name || (u.full_name + "'s Store")}</div>
                                                <div class="text-[11px] text-slate-500">${u.full_name || u.username}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td class="py-3 font-mono text-xs text-slate-700">${u.email || u.username}</td>
                                    <td class="py-3">
                                        <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${u.role === 'creator' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}">
                                            ${u.role === 'creator' ? 'Creator Admin' : 'Store Owner'}
                                        </span>
                                    </td>
                                    <td class="py-3 text-center font-mono text-xs font-bold text-slate-700">${u.total_products || 0}</td>
                                    <td class="py-3 text-center font-mono text-xs font-bold text-slate-700">${u.total_orders || 0}</td>
                                    <td class="py-3 text-right font-mono text-xs font-bold text-emerald-600">৳ ${UI.formatMoney(u.total_revenue || 0)}</td>
                                    <td class="py-3 text-right">
                                        <button class="btn btn-primary text-xs py-1.5 px-3 flex items-center gap-1 ml-auto" onclick="Users.inspectUser(${u.id})">
                                            <span class="material-symbols-outlined text-sm">visibility</span> Inspect User Data
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Inspect User Data Modal Container -->
            <div id="user-inspect-modal" class="fixed inset-0 modal-overlay z-50 hidden flex items-center justify-center p-4"></div>
        `;
    },

    async inspectUser(userId) {
        const modal = document.getElementById('user-inspect-modal');
        if (!modal) return;

        modal.innerHTML = `
            <div class="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
                <div class="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-900 text-white">
                    <div class="flex items-center gap-3">
                        <span class="material-symbols-outlined text-amber-400 text-2xl">insights</span>
                        <div>
                            <h3 class="font-bold text-base">User Deep Data Inspector</h3>
                            <p class="text-xs text-slate-400">Inspecting User ID: ${userId}</p>
                        </div>
                    </div>
                    <button class="text-slate-400 hover:text-white rounded-lg p-1" onclick="document.getElementById('user-inspect-modal').classList.add('hidden')">
                        <span class="material-symbols-outlined text-xl">close</span>
                    </button>
                </div>
                <div class="p-6 overflow-y-auto flex-1 space-y-6" id="inspect-modal-body">
                    <div class="text-center py-12 text-slate-400">Loading full user data...</div>
                </div>
            </div>
        `;
        modal.classList.remove('hidden');

        try {
            const res = await API.request(`users/inspect_user?user_id=${userId}`);
            const body = document.getElementById('inspect-modal-body');
            if (!res || !res.data) {
                body.innerHTML = `<div class="text-center py-8 text-red-500 text-sm">Could not load user details.</div>`;
                return;
            }

            const data = res.data;
            const u = data.user || {};
            const m = data.metrics || {};
            const prods = data.products || [];
            const orders = data.orders || [];
            const expenses = data.expenses || [];

            body.innerHTML = `
                <!-- User Profile Header Card -->
                <div class="p-5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div class="flex items-center gap-4">
                        <div class="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg font-mono shadow-md">
                            ${(u.full_name || u.username || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h2 class="text-lg font-bold text-slate-900">${u.business_name || 'Store'}</h2>
                            <p class="text-xs text-slate-500">Owner: <span class="font-semibold text-slate-800">${u.full_name || u.username}</span> (${u.email || u.username})</p>
                        </div>
                    </div>
                    <button class="btn btn-secondary text-xs px-4 py-2 flex items-center gap-1.5" onclick="Users.switchToUserWorkspace(${u.id}, '${(u.business_name || u.full_name || 'User').replace(/'/g, "\\'")}')">
                        <span class="material-symbols-outlined text-sm">open_in_new</span> Switch to Store View
                    </button>
                </div>

                <!-- User Metrics Cards -->
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div class="p-4 bg-blue-50/50 rounded-xl border border-blue-100">
                        <p class="text-[11px] font-semibold uppercase text-blue-700">Total Products</p>
                        <h4 class="text-xl font-bold text-blue-900 mt-1">${m.total_products || prods.length}</h4>
                    </div>
                    <div class="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100">
                        <p class="text-[11px] font-semibold uppercase text-emerald-700">Total Orders</p>
                        <h4 class="text-xl font-bold text-emerald-900 mt-1">${m.total_orders || orders.length}</h4>
                    </div>
                    <div class="p-4 bg-amber-50/50 rounded-xl border border-amber-100">
                        <p class="text-[11px] font-semibold uppercase text-amber-700">Total Revenue</p>
                        <h4 class="text-xl font-bold text-amber-900 mt-1">৳ ${UI.formatMoney(m.total_revenue || 0)}</h4>
                    </div>
                    <div class="p-4 bg-purple-50/50 rounded-xl border border-purple-100">
                        <p class="text-[11px] font-semibold uppercase text-purple-700">Net Profit</p>
                        <h4 class="text-xl font-bold text-purple-900 mt-1">৳ ${UI.formatMoney(m.net_profit || 0)}</h4>
                    </div>
                </div>

                <!-- Data Tabs -->
                <div class="border-b border-slate-200 flex gap-4 text-xs font-semibold">
                    <button class="py-2 px-3 border-b-2 border-blue-600 text-blue-600" id="inspect-tab-prods">User Products (${prods.length})</button>
                    <button class="py-2 px-3 border-b-2 border-transparent text-slate-500" id="inspect-tab-orders">User Sales (${orders.length})</button>
                    <button class="py-2 px-3 border-b-2 border-transparent text-slate-500" id="inspect-tab-exp">User Expenses (${expenses.length})</button>
                </div>

                <!-- Products Table -->
                <div id="inspect-content-prods" class="overflow-x-auto border border-slate-200 rounded-xl">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Product Name</th>
                                <th>SKU</th>
                                <th>Category</th>
                                <th class="text-right">Price</th>
                                <th class="text-center">Stock</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${prods.length === 0 ? `<tr><td colspan="5" class="text-center py-6 text-slate-400 text-xs">No products in this user store catalog.</td></tr>` : 
                            prods.map(p => `
                                <tr>
                                    <td class="font-bold text-xs text-slate-900">${p.name}</td>
                                    <td class="font-mono text-xs text-slate-600">${p.sku || '-'}</td>
                                    <td class="text-xs text-slate-600">${p.category || 'General'}</td>
                                    <td class="text-right font-mono text-xs font-bold text-slate-800">৳ ${UI.formatMoney(p.selling_price || 0)}</td>
                                    <td class="text-center font-mono text-xs font-bold text-blue-600">${p.current_stock || 0}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>

                <!-- Orders Table (Hidden by default) -->
                <div id="inspect-content-orders" class="overflow-x-auto border border-slate-200 rounded-xl hidden">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Order Ref</th>
                                <th>Customer</th>
                                <th>Status</th>
                                <th>Date</th>
                                <th class="text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${orders.length === 0 ? `<tr><td colspan="5" class="text-center py-6 text-slate-400 text-xs">No sales orders recorded by this user yet.</td></tr>` : 
                            orders.map(o => `
                                <tr>
                                    <td class="font-bold text-xs text-slate-900">${o.order_number || ('#ORD-' + o.id)}</td>
                                    <td class="text-xs text-slate-700">${o.customer_name || 'Walk-in Customer'}</td>
                                    <td class="text-xs"><span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">${o.order_status || 'completed'}</span></td>
                                    <td class="text-xs text-slate-500 font-mono">${UI.formatDate(o.created_at || new Date())}</td>
                                    <td class="text-right font-mono text-xs font-bold text-emerald-600">৳ ${UI.formatMoney(o.total_amount || 0)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>

                <!-- Expenses Table (Hidden by default) -->
                <div id="inspect-content-exp" class="overflow-x-auto border border-slate-200 rounded-xl hidden">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Expense Category</th>
                                <th>Description</th>
                                <th>Date</th>
                                <th class="text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${expenses.length === 0 ? `<tr><td colspan="4" class="text-center py-6 text-slate-400 text-xs">No expenses recorded for this user.</td></tr>` : 
                            expenses.map(e => `
                                <tr>
                                    <td class="font-bold text-xs text-slate-900">${e.category || 'General'}</td>
                                    <td class="text-xs text-slate-600">${e.description || '-'}</td>
                                    <td class="text-xs text-slate-500 font-mono">${UI.formatDate(e.created_at || new Date())}</td>
                                    <td class="text-right font-mono text-xs font-bold text-red-600">৳ ${UI.formatMoney(e.amount || 0)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;

            // Tab click handling inside modal
            const tabP = document.getElementById('inspect-tab-prods');
            const tabO = document.getElementById('inspect-tab-orders');
            const tabE = document.getElementById('inspect-tab-exp');
            const contP = document.getElementById('inspect-content-prods');
            const contO = document.getElementById('inspect-content-orders');
            const contE = document.getElementById('inspect-content-exp');

            tabP.onclick = () => {
                tabP.className = "py-2 px-3 border-b-2 border-blue-600 text-blue-600 font-semibold";
                tabO.className = "py-2 px-3 border-b-2 border-transparent text-slate-500 font-semibold";
                tabE.className = "py-2 px-3 border-b-2 border-transparent text-slate-500 font-semibold";
                contP.classList.remove('hidden');
                contO.classList.add('hidden');
                contE.classList.add('hidden');
            };

            tabO.onclick = () => {
                tabO.className = "py-2 px-3 border-b-2 border-blue-600 text-blue-600 font-semibold";
                tabP.className = "py-2 px-3 border-b-2 border-transparent text-slate-500 font-semibold";
                tabE.className = "py-2 px-3 border-b-2 border-transparent text-slate-500 font-semibold";
                contO.classList.remove('hidden');
                contP.classList.add('hidden');
                contE.classList.add('hidden');
            };

            tabE.onclick = () => {
                tabE.className = "py-2 px-3 border-b-2 border-blue-600 text-blue-600 font-semibold";
                tabP.className = "py-2 px-3 border-b-2 border-transparent text-slate-500 font-semibold";
                tabO.className = "py-2 px-3 border-b-2 border-transparent text-slate-500 font-semibold";
                contE.classList.remove('hidden');
                contP.classList.add('hidden');
                contO.classList.add('hidden');
            };

        } catch(err) {
            UI.toast('Failed to inspect user data', 'error');
        }
    },

    switchToUserWorkspace(userId, storeName) {
        document.getElementById('user-inspect-modal')?.classList.add('hidden');
        const targetUser = {
            id: userId,
            username: 'user_' + userId,
            full_name: storeName,
            business_name: storeName,
            role: 'admin'
        };
        API.setCurrentUser(targetUser);
        UI.toast(`Switched workspace view to: ${storeName}`);
        if (window.App) {
            window.App.checkAuth();
            window.App.navigate('dashboard');
        }
    },

    debounceSearch() {
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => this.filterUsers(), 300);
    },

    async loadRoles() {
        try {
            const res = await API.get('users/roles');
            if (res.data && res.data.roles) {
                this.rolesData = res.data.roles;
            }
        } catch(e) {}
    },

    async loadUsers(isSilent = false) {
        const tbody = document.getElementById('user-list');
        if (!tbody && !document.getElementById('attendance-matrix-container')) return;

        try {
            const res = await API.get('users/list');
            const rawUsers = res.data.users || [];
            const currentUser = API.getCurrentUser();
            const currentId = currentUser?.id;
            const currentUname = (currentUser?.username || '').toLowerCase();

            const users = rawUsers.filter(u => {
                const uname = (u.username || '').toLowerCase();
                const email = (u.email || '').toLowerCase();
                const role = (u.role_name || u.role || '').toLowerCase();
                const isCreator = uname === 'shad@dbms.com' || uname === 'shad' || email === 'shad@dbms.com' || role === 'creator' || u.id === 99999;
                const isDemoAdmin = uname === 'admin' || uname === 'system_admin' || email === 'admin@easebus.com';

                return !isCreator && !isDemoAdmin;
            });

            this.usersData = users;
            this.updateKPIs(users);
            this.filterUsers();
            if (this.activeTab === 'attendance' && document.getElementById('attendance-matrix-container')) {
                this.renderAttendanceMatrix();
            }
        } catch (e) {
            if (!isSilent && tbody) {
                tbody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-red-400 text-xs font-inter">Failed to load staff accounts.</td></tr>`;
                UI.toast('Failed to load users', 'error');
            }
        }
    },

    updateKPIs(users) {
        const total = users.length;
        const managers = users.filter(u => u.role_name === 'manager' || u.role === 'manager').length;
        const active = users.filter(u => u.status === 'active').length;

        const totalEl = document.getElementById('kpi-total-users');
        const adminEl = document.getElementById('kpi-active-admins');
        const activeEl = document.getElementById('kpi-active-staff');

        if (totalEl) totalEl.textContent = total;
        if (adminEl) adminEl.textContent = managers;
        if (activeEl) activeEl.textContent = active;
    },

    filterUsers() {
        const search = (document.getElementById('user-search')?.value || '').toLowerCase();
        const role = document.getElementById('filter-role')?.value || 'all';
        const status = document.getElementById('filter-status')?.value || 'all';
        const tbody = document.getElementById('user-list');
        if (!tbody) return;

        const currentUser = API.getCurrentUser();
        const currentId = currentUser?.id;
        const currentUname = (currentUser?.username || '').toLowerCase();

        let filtered = this.usersData.filter(u => {
            const uname = (u.username || '').toLowerCase();
            const email = (u.email || '').toLowerCase();
            const r = (u.role_name || u.role || '').toLowerCase();
            
            // Exclude Creator, Demo System Admin, and logged-in Store Owner
            const isCreator = uname === 'shad@dbms.com' || uname === 'shad' || email === 'shad@dbms.com' || r === 'creator' || u.id === 99999;
            const isDemoAdmin = uname === 'admin' || uname === 'system_admin' || email === 'admin@easebus.com';
            const isSelfOwner = (currentId && u.id == currentId) || (currentUname && uname === currentUname);

            if (isCreator || isDemoAdmin || isSelfOwner) return false;

            const matchSearch = !search ||
                (u.full_name || u.name || '').toLowerCase().includes(search) ||
                (u.username || '').toLowerCase().includes(search) ||
                (u.email || '').toLowerCase().includes(search) ||
                (u.phone || '').toLowerCase().includes(search);

            const matchRole = role === 'all' || r === role;
            const matchStatus = status === 'all' || u.status === status;

            return matchSearch && matchRole && matchStatus;
        });

        if (filtered.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-12">
                        <div class="flex flex-col items-center justify-center">
                            <span class="material-symbols-outlined text-4xl text-slate-600 mb-2">badge</span>
                            <p class="text-slate-300 text-sm font-bold font-jakarta">No Staff Members Found</p>
                            <p class="text-slate-500 text-xs mt-1 font-inter max-w-sm">You haven't added any staff or employees to your business yet. Click "+ Add New Staff" to create employee accounts.</p>
                            <button class="btn btn-primary text-xs mt-4 py-2 px-4 font-outfit font-bold bg-blue-600 hover:bg-blue-500" onclick="Users.showModal()">
                                <span class="material-symbols-outlined text-sm">person_add</span> Add New Staff Member
                            </button>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        const getRoleBadge = (u) => {
            const uname = (u.username || '').toLowerCase();
            const roleStr = (u.role_name || u.role || '').toLowerCase();

            if (uname === 'hisham') {
                return '<span class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold font-outfit bg-blue-500/20 text-blue-300 border border-blue-500/30"><span class="w-1.5 h-1.5 rounded-full bg-blue-400"></span>Store Owner</span>';
            }
            if (uname === 'tanvir' || roleStr === 'admin') {
                return '<span class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold font-outfit bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"><span class="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>Store Administrator</span>';
            }
            if (roleStr === 'manager') {
                return '<span class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold font-outfit bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"><span class="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>Store Manager</span>';
            }
            if (roleStr === 'sales') {
                return '<span class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold font-outfit bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"><span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>Sales Staff</span>';
            }
            if (roleStr === 'accountant') {
                return '<span class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold font-outfit bg-purple-500/20 text-purple-300 border border-purple-500/30"><span class="w-1.5 h-1.5 rounded-full bg-purple-400"></span>Staff Accountant</span>';
            }
            return '<span class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold font-outfit bg-slate-800 text-slate-300 border border-slate-700">Staff Member</span>';
        };

        const getAccountStatusBadge = (s) => {
            if (s === 'active') return '<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold font-outfit bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Enabled</span>';
            return '<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold font-outfit bg-red-500/20 text-red-300 border border-red-500/30">Suspended</span>';
        };

        const getLiveStatusBadge = (u) => {
            const online = Users.isOnlineNow(u);
            if (online) {
                return '<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold font-outfit bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"><span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>Online Now</span>';
            }
            return '<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold font-outfit bg-slate-800 text-slate-400 border border-slate-700"><span class="w-1.5 h-1.5 rounded-full bg-slate-500"></span>Offline</span>';
        };

        tbody.innerHTML = filtered.map(u => `
            <tr class="hover:bg-slate-800/50 transition-colors cursor-pointer" onclick="Users.showStaffDetailModal(${u.id})">
                <td class="py-3.5">
                    <div class="flex items-center gap-3">
                        <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center font-bold text-xs font-digit shadow-md">
                            ${(u.full_name || u.name || u.username || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <div class="font-bold text-white text-xs font-jakarta">${u.full_name || u.name || u.username}</div>
                            <div class="text-[11px] text-slate-400 font-digit">@${u.username}</div>
                        </div>
                    </div>
                </td>
                <td class="py-3.5">
                    <div class="text-xs font-digit text-slate-300">${u.phone || u.email || 'N/A'}</div>
                    <div class="text-[11px] text-slate-400 font-digit">${u.email || '-'}</div>
                </td>
                <td class="py-3.5">${getRoleBadge(u)}</td>
                <td class="py-3.5">${getAccountStatusBadge(u.status)}</td>
                <td class="py-3.5">${getLiveStatusBadge(u)}</td>
                <td class="py-3.5 text-xs text-slate-400 font-digit">${u.last_login_at ? UI.formatDate(u.last_login_at) : '19 Aug 2026, 23:19'}</td>
                <td class="py-3.5 text-right" onclick="event.stopPropagation()">
                    ${this.isOwner() ? `
                        <button class="btn btn-secondary text-xs py-1.5 px-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-outfit font-bold cursor-pointer" onclick="Users.showStaffDetailModal(${u.id})">
                            Inspect & Edit
                        </button>
                    ` : `
                        <button class="btn text-xs py-1.5 px-3 bg-slate-800/80 hover:bg-slate-750 border border-slate-700 text-slate-300 font-outfit font-semibold cursor-pointer flex items-center gap-1 ml-auto" onclick="Users.showStaffDetailModal(${u.id})">
                            <span class="material-symbols-outlined text-xs text-blue-400">visibility</span> View Activity Log
                        </button>
                    `}
                </td>
            </tr>
        `).join('');
    },

    showOwnerPermissionNotice() {
        let modal = document.getElementById('permission-notice-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'permission-notice-modal';
            modal.className = 'fixed inset-0 modal-overlay z-[100] flex items-center justify-center p-4 font-jakarta';
            document.body.appendChild(modal);
        }
        const user = API.getCurrentUser() || {};
        modal.innerHTML = `
            <div class="bg-slate-900 text-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-amber-500/40 animate-fade-in font-jakarta">
                <div class="p-6 text-center">
                    <div class="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-4 border border-amber-500/40 shadow-lg">
                        <span class="material-symbols-outlined text-3xl">lock_person</span>
                    </div>
                    <h3 class="font-bold text-lg text-white font-geist mb-2">Store Owner Permission Required</h3>
                    <p class="text-xs text-slate-300 font-inter mb-6 leading-relaxed">As Store Administrator (<span class="font-bold text-amber-300">${user.full_name || user.username || 'tanvir'}</span>), you can inspect staff working activity logs in Read-Only mode. Creating new staff accounts or editing employee credentials requires authorization from primary Store Owner (<span class="font-bold text-blue-400">hisham</span>).</p>
                    <button type="button" onclick="document.getElementById('permission-notice-modal').remove()" class="btn text-xs font-bold px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 font-outfit cursor-pointer">
                        I Understand
                    </button>
                </div>
            </div>
        `;
    },

    async showStaffDetailModal(userId) {
        const u = this.usersData.find(user => user.id == userId);
        if (!u) return;

        let modal = document.getElementById('staff-detail-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'staff-detail-modal';
            modal.className = 'fixed inset-0 modal-overlay z-50 flex items-center justify-center p-4 font-jakarta';
            document.body.appendChild(modal);
        }

        const isOwner = this.isOwner();
        const isOnline = u.status === 'active';
        const roleDisplay = u.role_name ? (u.role_name.charAt(0).toUpperCase() + u.role_name.slice(1)) : (u.role ? u.role.toUpperCase() : 'Staff');
        const lastLoginFormatted = u.last_login_at ? UI.formatDate(u.last_login_at) : '19 Aug 2026, 23:19:02';
        const lastActivityFormatted = u.last_activity_at ? UI.formatDate(u.last_activity_at) : '19 Aug 2026, 23:42:15';

        modal.innerHTML = `
            <div class="bg-slate-900 text-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-800 animate-fade-in font-jakarta">
                <!-- Modal Header Banner -->
                <div class="p-6 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950/60 border-b border-slate-800 flex justify-between items-start">
                    <div class="flex items-center gap-4">
                        <div class="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-extrabold text-xl shadow-lg border border-blue-400/40 font-outfit">
                            ${(u.full_name || u.username || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <div class="flex items-center gap-2">
                                <h3 class="font-bold text-base text-white font-geist">${u.full_name || u.username}</h3>
                                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-500/20 text-blue-300 border border-blue-500/30 font-outfit">@${u.username}</span>
                            </div>
                            <p class="text-xs text-slate-400 font-inter mt-0.5">${roleDisplay} • Store: <span class="font-bold text-slate-200">eloria</span></p>
                        </div>
                    </div>
                    <button type="button" class="text-slate-400 hover:text-white rounded-lg p-1 cursor-pointer" onclick="document.getElementById('staff-detail-modal').remove()">
                        <span class="material-symbols-outlined text-lg">close</span>
                    </button>
                </div>

                <!-- Live Working & Attendance Audit Section -->
                <div class="p-6 space-y-5">
                    <div class="p-4 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                        <div class="flex items-center gap-3">
                            <div class="w-3 h-3 rounded-full ${isOnline ? 'bg-emerald-500 animate-ping' : 'bg-slate-600'}"></div>
                            <div>
                                <p class="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-outfit">Live Work & Attendance Status</p>
                                <h4 class="text-sm font-bold ${isOnline ? 'text-emerald-400' : 'text-slate-400'} font-jakarta">${isOnline ? 'Active & Working Logged In Now' : 'Offline'}</h4>
                            </div>
                        </div>
                        <span class="px-2.5 py-1 rounded-full text-xs font-bold font-outfit ${isOnline ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'}">
                            ${isOnline ? 'Active Shift' : 'Offline'}
                        </span>
                    </div>

                    <!-- Timestamps Grid -->
                    <div class="grid grid-cols-2 gap-4 text-xs font-inter">
                        <div class="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800">
                            <div class="flex items-center gap-2 text-slate-400 mb-1">
                                <span class="material-symbols-outlined text-sm text-blue-400">login</span>
                                <span class="font-semibold">Logged In Time</span>
                            </div>
                            <p class="font-bold text-white font-mono text-[11px]">${lastLoginFormatted}</p>
                        </div>
                        <div class="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800">
                            <div class="flex items-center gap-2 text-slate-400 mb-1">
                                <span class="material-symbols-outlined text-sm text-purple-400">logout</span>
                                <span class="font-semibold">Last Activity / Logged Out</span>
                            </div>
                            <p class="font-bold text-white font-mono text-[11px]">${lastActivityFormatted}</p>
                        </div>
                    </div>

                    <!-- Contact & Credentials Grid -->
                    <div class="p-4 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2 text-xs font-inter">
                        <div class="flex justify-between items-center">
                            <span class="text-slate-400 font-medium">Contact Phone:</span>
                            <span class="font-bold text-slate-200 font-mono">${u.phone || '01700112244'}</span>
                        </div>
                        <div class="flex justify-between items-center">
                            <span class="text-slate-400 font-medium">Email Address:</span>
                            <span class="font-bold text-slate-200">${u.email || 'staff@easebus.com'}</span>
                        </div>
                        <div class="flex justify-between items-center">
                            <span class="text-slate-400 font-medium">Designation / Security Role:</span>
                            <span class="font-bold text-indigo-300 font-outfit uppercase text-[11px]">${roleDisplay}</span>
                        </div>
                    </div>

                    <!-- Controls / Action Footer -->
                    <div class="pt-4 border-t border-slate-800 flex items-center justify-end gap-3 font-outfit">
                        ${isOwner ? `
                            <button type="button" class="btn text-xs font-bold px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-lg border border-blue-400/30 flex items-center gap-1.5 cursor-pointer" onclick="document.getElementById('staff-detail-modal').remove(); Users.showModal(${u.id});">
                                <span class="material-symbols-outlined text-sm">edit</span> Edit Credentials & Role
                            </button>
                        ` : `
                            <div class="text-[11px] text-amber-400 font-inter font-semibold flex items-center gap-1">
                                <span class="material-symbols-outlined text-sm">lock</span> Read-Only Mode (Owner Permission Required to Modify)
                            </div>
                        `}
                    </div>
                </div>
            </div>
        `;
    },

    showModal(id = null) {
        if (!this.isOwner()) {
            this.showOwnerPermissionNotice();
            return;
        }
        let user = null;
        if (id) {
            user = this.usersData.find(u => u.id === id);
        }

        const modal = document.getElementById('user-modal');
        modal.innerHTML = `
            <div class="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200">
                <div class="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                    <div class="flex items-center gap-2">
                        <span class="material-symbols-outlined text-blue-600">${id ? 'manage_accounts' : 'person_add'}</span>
                        <h3 class="font-geist font-bold text-base text-slate-900">${id ? 'Edit Staff Member' : 'Add New Staff Member'}</h3>
                    </div>
                    <button class="text-slate-400 hover:text-slate-600 rounded-lg p-1" onclick="document.getElementById('user-modal').classList.add('hidden')">
                        <span class="material-symbols-outlined text-lg">close</span>
                    </button>
                </div>
                <div class="p-6">
                    <form id="user-form" class="space-y-4">
                        <input type="hidden" name="id" value="${id || ''}">

                        <div>
                            <label class="form-label text-xs font-semibold text-slate-700">Full Name *</label>
                            <input type="text" name="full_name" class="form-input text-xs py-2" value="${user?.full_name || user?.name || ''}" placeholder="e.g. Tanvir Ahmed" required>
                        </div>

                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="form-label text-xs font-semibold text-slate-700">Username *</label>
                                <input type="text" name="username" class="form-input text-xs py-2" value="${user?.username || ''}" placeholder="username" ${id ? 'disabled' : 'required'}>
                            </div>
                            <div>
                                <label class="form-label text-xs font-semibold text-slate-700">Role *</label>
                                <select name="role_name" class="form-input text-xs py-2" required>
                                    <option value="admin" ${user?.role_name === 'admin' || user?.role === 'admin' ? 'selected' : ''}>Administrator</option>
                                    <option value="manager" ${user?.role_name === 'manager' || user?.role === 'manager' ? 'selected' : ''}>Store Manager</option>
                                    <option value="sales" ${user?.role_name === 'sales' || user?.role === 'sales' ? 'selected' : ''}>Sales Representative</option>
                                    <option value="accountant" ${user?.role_name === 'accountant' || user?.role === 'accountant' ? 'selected' : ''}>Staff Accountant</option>
                                </select>
                            </div>
                        </div>

                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="form-label text-xs font-semibold text-slate-700">Phone *</label>
                                <input type="text" name="phone" class="form-input text-xs py-2" value="${user?.phone || '01700112233'}" required>
                            </div>
                            <div>
                                <label class="form-label text-xs font-semibold text-slate-700">Email Address</label>
                                <input type="email" name="email" class="form-input text-xs py-2" value="${user?.email || ''}" placeholder="staff@easebus.com">
                            </div>
                        </div>

                        <div>
                            <label class="form-label text-xs font-semibold text-slate-700">${id ? 'New Password (optional)' : 'Account Password *'}</label>
                            <input type="password" name="password" class="form-input text-xs py-2" placeholder="${id ? 'Leave empty to preserve password' : '••••••••'}" ${id ? '' : 'required'}>
                        </div>

                        ${id ? `
                            <div>
                                <label class="form-label text-xs font-semibold text-slate-700">Account Status</label>
                                <select name="status" class="form-input text-xs py-2">
                                    <option value="active" ${user?.status === 'active' ? 'selected' : ''}>Active</option>
                                    <option value="inactive" ${user?.status === 'inactive' ? 'selected' : ''}>Inactive</option>
                                </select>
                            </div>
                        ` : ''}

                        <div class="pt-4 flex justify-end gap-3 border-t border-slate-100">
                            <button type="button" class="btn btn-secondary text-xs px-4 py-2" onclick="document.getElementById('user-modal').classList.add('hidden')">Cancel</button>
                            <button type="submit" class="btn btn-primary text-xs px-4 py-2" id="save-user-btn">
                                ${id ? 'Save Staff Updates' : 'Create Staff Account'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        modal.classList.remove('hidden');

        document.getElementById('user-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const form = e.target;
            const btn = document.getElementById('save-user-btn');
            btn.disabled = true;
            btn.textContent = 'Saving...';

            const rawEmail = (form.email ? form.email.value : '').trim();
            const payload = {
                full_name: form.full_name.value.trim(),
                phone: form.phone.value.trim(),
                email: (rawEmail && rawEmail.includes('@')) ? rawEmail : '',
                role_name: form.role_name.value,
                role: form.role_name.value,
                status: form.status ? form.status.value : 'active'
            };

            if (form.password.value) payload.password = form.password.value;
            if (form.id && form.id.value) {
                payload.id = parseInt(form.id.value);
            } else {
                payload.username = form.username.value.trim();
            }

            try {
                if (payload.id) {
                    await API.put('users/update', payload);
                } else {
                    await API.post('users/create', payload);
                }

                modal.classList.add('hidden');
                UI.toast(id ? 'Staff member updated successfully' : 'Staff account created successfully');
                await this.loadUsers();
            } catch (err) {
                UI.toast(err.message || 'Operation failed', 'error');
            } finally {
                btn.disabled = false;
                btn.textContent = id ? 'Save Staff Updates' : 'Create Staff Account';
            }
        });
    },

    showCreatorTicketResponseModal(ticketId, currentStatus = 'resolved', currentResponse = '') {
        let modal = document.getElementById('creator-ticket-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'creator-ticket-modal';
            modal.className = 'fixed inset-0 modal-overlay z-50 flex items-center justify-center p-4 font-jakarta';
            document.body.appendChild(modal);
        }

        modal.innerHTML = `
            <div class="bg-slate-900 text-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-800 animate-fade-in font-jakarta">
                <div class="p-5 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950/60 border-b border-slate-800 flex justify-between items-center">
                    <div class="flex items-center gap-2">
                        <span class="material-symbols-outlined text-blue-400">admin_panel_settings</span>
                        <h3 class="font-bold text-base text-white font-geist">Respond to Ticket #${ticketId}</h3>
                    </div>
                    <button type="button" class="text-slate-400 hover:text-white rounded-lg p-1 cursor-pointer" onclick="document.getElementById('creator-ticket-modal').remove()">
                        <span class="material-symbols-outlined text-lg">close</span>
                    </button>
                </div>

                <div class="p-6 space-y-4 font-inter text-xs">
                    <div>
                        <label class="form-label text-xs font-semibold text-slate-300">Ticket Status *</label>
                        <select id="creator-ticket-status" class="form-input text-xs py-2 bg-slate-950 border-slate-800 text-white font-bold font-outfit">
                            <option value="in_progress" ${currentStatus === 'in_progress' ? 'selected' : ''}>In Progress (Investigating)</option>
                            <option value="resolved" ${currentStatus === 'resolved' ? 'selected' : ''}>Resolved & Fixed</option>
                            <option value="open" ${currentStatus === 'open' ? 'selected' : ''}>Open (Pending)</option>
                        </select>
                    </div>

                    <div>
                        <label class="form-label text-xs font-semibold text-slate-300">Creator Resolution / Response Notes</label>
                        <textarea id="creator-ticket-response" rows="4" class="form-input text-xs py-2 bg-slate-950 border-slate-800 text-white" placeholder="Explain the fix or answer to the store owner...">${currentResponse}</textarea>
                    </div>

                    <div class="pt-3 border-t border-slate-800 flex justify-end gap-3 font-outfit">
                        <button type="button" class="btn text-xs px-4 py-2 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 cursor-pointer" onclick="document.getElementById('creator-ticket-modal').remove()">
                            Cancel
                        </button>
                        <button type="button" class="btn text-xs font-bold px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-lg border border-blue-400/30 cursor-pointer" onclick="Users.saveCreatorTicketResponse(${ticketId})">
                            Save & Update Ticket
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    async saveCreatorTicketResponse(ticketId) {
        const status = document.getElementById('creator-ticket-status')?.value || 'resolved';
        const response = document.getElementById('creator-ticket-response')?.value || '';

        try {
            UI.setLoading(true);
            await API.post('support?action=update_status', { ticket_id: ticketId, status, response });
            document.getElementById('creator-ticket-modal')?.remove();
            UI.toast(`Ticket #${ticketId} updated cleanly to ${status}`);
            if (window.App) window.App.navigate('users');
        } catch(err) {
            UI.toast(err.message || 'Failed to update ticket', 'error');
        } finally {
            UI.setLoading(false);
        }
    }
};

// Auto-register with router if active
if (window.App && window.App.currentRoute === 'users') {
    window.Users.render(document.getElementById('screen-container'));
}
