// Trip Planner - client-side localStorage logic with Bootstrap toasts
(function(){
	const STORAGE_BOOKINGS = 'trip_bookings';
	const STORAGE_USERS = 'trip_users';
	const STORAGE_CURRENT = 'trip_current';

	const authBtn = document.getElementById('authBtn');
	const authModalEl = document.getElementById('authModal');
	const authModal = new bootstrap.Modal(authModalEl);
	const bookingModalEl = document.getElementById('bookingModal');
	const bookingModal = new bootstrap.Modal(bookingModalEl);
	const bookingsListEl = document.getElementById('bookingsList');
	const bookingsCount = document.getElementById('bookingsCount');
	const toastContainer = document.getElementById('toastContainer');

	function getBookings() { try { return JSON.parse(localStorage.getItem(STORAGE_BOOKINGS)) || []; } catch(e){ return []; } }
	function saveBookings(items){ localStorage.setItem(STORAGE_BOOKINGS, JSON.stringify(items)); }

	function getUsers(){ try { return JSON.parse(localStorage.getItem(STORAGE_USERS)) || []; } catch(e){ return []; } }
	function saveUsers(u){ localStorage.setItem(STORAGE_USERS, JSON.stringify(u)); }

	function getCurrent(){ try { return JSON.parse(localStorage.getItem(STORAGE_CURRENT)) || null } catch(e){ return null } }
	function setCurrent(u){ localStorage.setItem(STORAGE_CURRENT, JSON.stringify(u)); }
	function clearCurrent(){ localStorage.removeItem(STORAGE_CURRENT); }

	function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]); }

	function renderBookings(){
		const items = getBookings();
		bookingsListEl.innerHTML = '';
		bookingsCount.textContent = items.length;
		if(!items.length){
			bookingsListEl.innerHTML = '<div class="text-muted p-3">No bookings yet. Book a package to get started.</div>';
			return;
		}
		items.forEach((b, i) => {
			const el = document.createElement('div');
			el.className = 'list-group-item';
			el.innerHTML = `
				<div class="flex-grow-1">
					<div class="fw-bold fs-5">${escapeHtml(b.package)}</div>
					<div class="text-muted small">Booked by: ${escapeHtml(b.bookerName || 'Guest')}</div>
					<div class="text-muted small">Phone: ${escapeHtml(b.bookerPhone || 'N/A')}</div>
					<div class="text-muted small">Travel Date: ${escapeHtml(b.travelDate || 'N/A')} | Persons: ${b.numberOfPersons || 1}</div>
					<div class="text-muted small">Total Price: ₹ ${b.totalPrice || 0}</div>
					<div class="text-muted small">Booked on: ${new Date(b.time).toLocaleString()}</div>
				</div>
				<div class="d-flex gap-2 flex-wrap">
					<span class="badge bg-success badge-status">${escapeHtml(b.status || 'Confirmed')}</span>
					<button class="btn btn-sm btn-outline-danger btn-cancel" data-index="${i}">Cancel</button>
				</div>
			`;
			bookingsListEl.appendChild(el);
		});
	}

	// Toast helper using Bootstrap Toast
	function showToast(message, type = 'success', timeout = 4000){
		const toastId = 't' + Date.now();
		const wrapper = document.createElement('div');
		wrapper.innerHTML = `
			<div id="${toastId}" class="toast align-items-center text-white toast-custom ${type==='success' ? 'bg-success' : 'bg-danger'}" role="alert" aria-live="assertive" aria-atomic="true">
				<div class="d-flex">
					<div class="toast-body">${escapeHtml(message)}</div>
					<button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
				</div>
			</div>
		`;
		const node = wrapper.firstElementChild;
		toastContainer.appendChild(node);
		const bsToast = new bootstrap.Toast(node, { delay: timeout });
		bsToast.show();
		node.addEventListener('hidden.bs.toast', () => node.remove());
	}

	function openBookingForm(packageName, packagePrice) {
		const current = getCurrent();
		if(!current){
			showToast('Please login first to book packages!', 'danger');
			authModal.show();
			return;
		}

		// Populate form with package details and user info
		document.getElementById('packageName').value = packageName;
		document.getElementById('packagePrice').value = packagePrice;
		document.getElementById('displayPackage').value = packageName;
		document.getElementById('displayPrice').value = '₹ ' + Number(packagePrice).toLocaleString('en-IN');
		document.getElementById('bookerName').value = current.name || '';
		document.getElementById('bookerEmail').value = current.email || '';
		document.getElementById('numberOfPersons').value = 1;
		document.getElementById('travelDate').value = '';
		document.getElementById('specialRequests').value = '';
		
		// Set today's date as minimum date
		const today = new Date().toISOString().split('T')[0];
		document.getElementById('travelDate').min = today;
		
		// Calculate total price
		calculateTotalPrice();
		
		// Show booking modal
		bookingModal.show();
	}

	function calculateTotalPrice() {
		const price = Number(document.getElementById('packagePrice').value) || 0;
		const persons = Number(document.getElementById('numberOfPersons').value) || 1;
		const totalPrice = price * persons;
		document.getElementById('totalPrice').value = '₹ ' + totalPrice.toLocaleString('en-IN');
	}

	// delegation for Book buttons and package links
	document.addEventListener('click', function(e){
		const b = e.target.closest('.btn-book');
		if(b){ 
			const pkg = b.dataset.package;
			const price = b.dataset.price;
			openBookingForm(pkg, price);
			return;
		}

		const pl = e.target.closest('.package-link');
		if(pl){ const el = document.querySelector('#packages'); if(el) el.scrollIntoView({behavior:'smooth'}); return; }

		const cancel = e.target.closest('.btn-cancel');
		if(cancel){ const idx = Number(cancel.dataset.index); const items = getBookings(); if(items[idx]) items.splice(idx,1); saveBookings(items); renderBookings(); showToast('Booking cancelled', 'success'); return; }
	});

	// Booking form submission
	document.getElementById('bookingForm').addEventListener('submit', function(e){
		e.preventDefault();
		
		const current = getCurrent();
		if(!current){
			showToast('Session expired. Please login again.', 'danger');
			bookingModal.hide();
			authModal.show();
			return;
		}

		const packageName = document.getElementById('packageName').value;
		const packagePrice = Number(document.getElementById('packagePrice').value);
		const bookerName = document.getElementById('bookerName').value.trim();
		const bookerEmail = document.getElementById('bookerEmail').value.trim();
		const bookerPhone = document.getElementById('bookerPhone').value.trim();
		const numberOfPersons = Number(document.getElementById('numberOfPersons').value);
		const travelDate = document.getElementById('travelDate').value;
		const specialRequests = document.getElementById('specialRequests').value.trim();
		const totalPrice = packagePrice * numberOfPersons;

		if(!bookerName || !bookerEmail || !bookerPhone || !travelDate){
			showToast('Please fill all required fields!', 'danger');
			return;
		}

		if(bookerPhone.length !== 10){
			showToast('Please enter a valid 10-digit phone number!', 'danger');
			return;
		}

		const items = getBookings();
		items.push({
			package: packageName,
			packagePrice: packagePrice,
			bookerName: bookerName,
			bookerEmail: bookerEmail,
			bookerPhone: bookerPhone,
			numberOfPersons: numberOfPersons,
			travelDate: travelDate,
			totalPrice: totalPrice,
			specialRequests: specialRequests,
			time: Date.now(),
			userEmail: current.email,
			userName: current.name || current.email,
			status: 'Confirmed'
		});
		
		saveBookings(items);
		renderBookings();
		bookingModal.hide();
		showToast('Booking confirmed! Check My Bookings for details.', 'success');
		
		// Scroll to bookings section
		setTimeout(() => {
			document.getElementById('bookings').scrollIntoView({behavior:'smooth'});
		}, 500);
	});

	// Calculate total price when number of persons changes
	document.getElementById('numberOfPersons').addEventListener('change', calculateTotalPrice);

	// Destination quick content - handles both navbar links and destination cards
	function displayDestinationInfo(name) {
		const destContent = document.getElementById('destContent');
		let html = '';
		
		if (name === 'Paris') {
			html = `<div class="alert alert-info mt-3"><h5>&#127467;&#127479; Paris, France</h5><p><strong>Best Time to Visit:</strong> April-May, September-October</p><p><strong>Must-See:</strong> Eiffel Tower, Louvre Museum, Notre-Dame Cathedral, Arc de Triomphe</p><p><strong>Local Cuisine:</strong> Croissants, French Wine, Escargot</p></div>`;
		} else if (name === 'Bali') {
			html = `<div class="alert alert-success mt-3"><h5>&#127470;&#127473; Bali, Indonesia</h5><p><strong>Best Time to Visit:</strong> April-October</p><p><strong>Must-See:</strong> Tanah Lot Temple, Ubud Monkey Forest, Mount Batur, Sacred Monkey Sanctuary</p><p><strong>Activities:</strong> Surfing, Yoga Retreats, Rice Paddy Tours, Traditional Spa</p></div>`;
		} else if (name === 'Tokyo') {
			html = `<div class="alert alert-warning mt-3"><h5>&#127471;&#127477; Tokyo, Japan</h5><p><strong>Best Time to Visit:</strong> March-May, September-November</p><p><strong>Must-See:</strong> Senso-ji Temple, Tokyo Skytree, Shinjuku, Shibuya Crossing</p><p><strong>Experiences:</strong> Sumo Wrestling, Traditional Tea Ceremony, Karaoke, Anime District</p></div>`;
		}
		
		destContent.innerHTML = html;
		destContent.scrollIntoView({behavior:'smooth'});
	}
	
	// Navbar destination links
	document.querySelectorAll('[data-dest]').forEach(a => {
		a.addEventListener('click', (ev) => {
			ev.preventDefault();
			const name = a.getAttribute('data-dest');
			displayDestinationInfo(name);
		});
	});
	
	// Destination cards
	document.querySelectorAll('.dest-card').forEach(card => {
		card.addEventListener('click', (ev) => {
			const destName = card.getAttribute('data-dest');
			displayDestinationInfo(destName);
		});
	});

	// Auth UI
	document.getElementById('signupForm').addEventListener('submit', function(e){
		e.preventDefault();
		const name = document.getElementById('signupName').value.trim();
		const email = document.getElementById('signupEmail').value.trim().toLowerCase();
		const pw = document.getElementById('signupPassword').value;
		const users = getUsers();
		if(users.find(u => u.email === email)){
			showToast('An account with this email already exists. Please login.', 'danger');
			return;
		}
		users.push({ name, email, password: pw });
		saveUsers(users);
		setCurrent({ name, email });
		renderBookings();
		updateAuthState();
		authModal.hide();
		showToast('Welcome! Your account was created.', 'success');
	});

	document.getElementById('loginForm').addEventListener('submit', function(e){
		e.preventDefault();
		const email = document.getElementById('loginEmail').value.trim().toLowerCase();
		const pw = document.getElementById('loginPassword').value;
		const users = getUsers();
		const found = users.find(u => u.email === email && u.password === pw);
		if(!found){ showToast('Invalid email or password.', 'danger'); return; }
		setCurrent({ name: found.name, email: found.email });
		updateAuthState();
		authModal.hide();
		renderBookings();
		showToast('Logged in successfully.', 'success');
	});

	function updateAuthState(){
		const cur = getCurrent();
		if(cur){
			authBtn.textContent = cur.name ? `Hi, ${cur.name}` : cur.email;
			authBtn.classList.remove('btn-outline-primary');
			authBtn.classList.add('btn-primary');
			authBtn.onclick = () => {
				if(confirm('Logout?')){ clearCurrent(); updateAuthState(); showToast('Logged out', 'success'); }
			};
		} else {
			authBtn.textContent = 'Login / Sign Up';
			authBtn.classList.remove('btn-primary');
			authBtn.classList.add('btn-outline-primary');
			authBtn.onclick = () => authModal.show();
		}
	}

	// bookings management from storage change
	window.addEventListener('storage', () => renderBookings());

	// initial setup
	document.addEventListener('DOMContentLoaded', () => {
		updateAuthState();
		renderBookings();
	});

})();

