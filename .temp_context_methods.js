/**
 * Show context menu for student actions
 */
showStudentContextMenu(student, event) {
    const menu = document.getElementById('student-context-menu');
    if (!menu) return;

    // Position the menu
    const x = event.clientX || (event.touches && event.touches[0].clientX) || 0;
    const y = event.clientY || (event.touches && event.touches[0].clientY) || 0;

    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    menu.style.display = 'block';

    // Store current student for menu actions
    menu.dataset.studentId = student.student_id;

    // Close menu when clicking outside
    const closeMenu = (e) => {
        if (!menu.contains(e.target)) {
            menu.style.display = 'none';
            document.removeEventListener('click', closeMenu);
            document.removeEventListener('touchstart', closeMenu);
        }
    };

    // Delay adding the close listeners to avoid immediate close
    setTimeout(() => {
        document.addEventListener('click', closeMenu);
        document.addEventListener('touchstart', closeMenu);
    }, 100);

    // Handle menu item clicks
    const menuItems = menu.querySelectorAll('.context-menu-item');
    menuItems.forEach(item => {
        item.onclick = (e) => {
            e.stopPropagation();
            const action = item.dataset.action;
            menu.style.display = 'none';

            switch (action) {
                case 'absent':
                    this.toggleAbsentStatus(student);
                    break;
                case 'forgot':
                    this.toggleForgotInstrument(student);
                    break;
                case 'stool':
                    this.toggleEarnedStool(student);
                    break;
            }
        };
    });
}

/**
 * Toggle forgot instrument status
 */
toggleForgotInstrument(student) {
    const hasForgot = this.sessionForgotInstrument.has(student.student_id);

    if (hasForgot) {
        // Remove from session tracker
        this.sessionForgotInstrument.delete(student.student_id);

        // Remove from results
        this.results = this.results.filter(r =>
            !(r.student_id === student.student_id && r.task_id === 'FORGOT_INSTRUMENT')
        );
        this.showNotification(`${student.name} - forgot instrument removed`, 'success');
    } else {
        // Add to session tracker
        this.sessionForgotInstrument.add(student.student_id);

        // Create record for CSV
        const record = {
            student_id: student.student_id,
            task_id: 'FORGOT_INSTRUMENT',
            response: 'true',
            completed_date: new Date().toISOString()
        };
        this.results.push(record);
        this.showNotification(`${student.name} - marked forgot instrument`, 'warning');
    }

    // Update and refresh
    this.updateLocalStorage();
    this.markUnsaved();
    this.showStudentScreen();
}

/**
 * Toggle earned stool status
 */
toggleEarnedStool(student) {
    const hasStool = this.sessionEarnedStool.has(student.student_id);

    if (hasStool) {
        // Remove from session tracker
        this.sessionEarnedStool.delete(student.student_id);

        // Remove from results
        this.results = this.results.filter(r =>
            !(r.student_id === student.student_id && r.task_id === 'EARNED_STOOL')
        );
        this.showNotification(`${student.name} - stool removed`, 'success');
    } else {
        // Add to session tracker
        this.sessionEarnedStool.add(student.student_id);

        // Create record for CSV
        const record = {
            student_id: student.student_id,
            task_id: 'EARNED_STOOL',
            response: 'true',
            completed_date: new Date().toISOString()
        };
        this.results.push(record);
        this.showNotification(`${student.name} - earned stool! ⭐`, 'success');
    }

    // Update and refresh
    this.updateLocalStorage();
    this.markUnsaved();
    this.showStudentScreen();
}
