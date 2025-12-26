// Matching page JavaScript
const API_BASE_URL = window.location.origin.includes('localhost') 
    ? 'http://localhost:8000' 
    : window.location.origin;
const HASDATA_API_KEY = 'afab492a-a163-430e-98f3-15eb248e3453';

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🔵 Matching page loaded');
    
    // Get user data from sessionStorage
    const phoneNumber = sessionStorage.getItem('phoneNumber');
    const userDataStr = sessionStorage.getItem('userData');
    
    console.log('📱 SessionStorage check:', { phoneNumber, hasUserData: !!userDataStr });
    
    if (!phoneNumber) {
        console.warn('⚠️ No phone number found in sessionStorage');
        console.warn('   This could mean:');
        console.warn('   1. Sign-in was not completed');
        console.warn('   2. SessionStorage was cleared');
        console.warn('   3. Navigation happened before sign-in');
        
        // Check URL parameters for test mode
        const urlParams = new URLSearchParams(window.location.search);
        const testPhone = urlParams.get('phone');
        
        if (testPhone) {
            console.log('✅ Test mode: Using phone from URL parameter');
            sessionStorage.setItem('phoneNumber', testPhone);
            // Reload to use the test phone number
            window.location.href = '/matching';
            return;
        }
        
        // Show error message before redirecting
        const loadingText = document.getElementById('loadingText');
        if (loadingText) {
            loadingText.textContent = 'Please sign in first. Redirecting...';
        }
        
        setTimeout(() => {
            window.location.href = '/';
        }, 3000);
        return;
    }

    let userData = null;
    if (userDataStr) {
        try {
            userData = JSON.parse(userDataStr);
            console.log('✅ User data loaded:', userData);
        } catch (e) {
            console.error('Error parsing user data:', e);
        }
    }

    // Get additional user data from Firebase (RAG)
    let enhancedUserData = await enhanceUserDataFromFirebase(userData, phoneNumber);
    
    // Update center avatar with user info
    updateCenterAvatar(enhancedUserData);

    // Find matches using enhanced data
    try {
        updateLoadingText('Analyzing your profile...');
        const matches = await findMatches(enhancedUserData, phoneNumber);
        console.log('✅ Found matches:', matches);
        
        if (matches && matches.length > 0) {
            // Display all matches (no minimum requirement)
            displayMatches(matches);
            updateLoadingText(`Found ${matches.length} ${matches.length === 1 ? 'match' : 'matches'}`);
        } else {
            updateLoadingText('No matches found at this time');
        }
    } catch (error) {
        console.error('❌ Error finding matches:', error);
        updateLoadingText('Error finding matches. Please try again.');
    } finally {
        hideLoading();
    }
});

async function enhanceUserDataFromFirebase(userData, phoneNumber) {
    try {
        if (!window.firebase || !window.firebase.db) {
            console.warn('Firebase not initialized');
            return userData;
        }

        const { collection, query, where, getDocs } = window.firebase;
        
        // Get user profile from Firebase
        const usersRef = collection(window.firebase.db, 'users');
        const q = query(usersRef, where('phoneNumber', '==', phoneNumber));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const firebaseUser = querySnapshot.docs[0].data();
            console.log('✅ Enhanced user data from Firebase:', firebaseUser);
            
            // Merge Firebase data with sessionStorage data
            return {
                ...userData,
                ...firebaseUser,
                // Extract keywords from bio for better matching
                keywords: extractKeywords(firebaseUser.bio || userData?.bio || ''),
                interests: firebaseUser.interests || [],
                skills: firebaseUser.skills || []
            };
        }
    } catch (error) {
        console.error('Error enhancing user data from Firebase:', error);
    }
    
    return userData;
}

function extractKeywords(text) {
    if (!text) return [];
    
    // Extract meaningful words (4+ characters, not common words)
    const commonWords = ['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'its', 'let', 'put', 'say', 'she', 'too', 'use'];
    const words = text.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length >= 4 && !commonWords.includes(word))
        .slice(0, 10);
    
    return [...new Set(words)]; // Remove duplicates
}

function updateCenterAvatar(userData) {
    const centerAvatar = document.querySelector('.center-avatar-image');
    if (!centerAvatar) return;

    if (userData && (userData.fullName || userData.firstName)) {
        const name = userData.fullName || `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
        const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=120&background=007AFF&bold=true&color=fff&rounded=true`;
        
        const avatarImg = document.createElement('img');
        avatarImg.src = avatarUrl;
        avatarImg.alt = name;
        avatarImg.style.cssText = 'width: 100%; height: 100%; object-fit: cover; border-radius: 50%;';
        avatarImg.onerror = function() {
            // Keep the SVG fallback
            this.style.display = 'none';
        };
        
        centerAvatar.innerHTML = '';
        centerAvatar.appendChild(avatarImg);
        
        // Keep SVG as fallback
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('fill', 'none');
        svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        svg.style.cssText = 'width: 100%; height: 100%; display: none;';
        centerAvatar.appendChild(svg);
    }
}

function getInitials(name) {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
}

async function findMatches(userData, phoneNumber) {
    console.log('🔍 Finding matches using Claude AI for:', { userData, phoneNumber });
    
    try {
        updateLoadingText('Analyzing your profile with AI...');
        
        // Call backend API that uses Claude AI
        const response = await axios.post(`${API_BASE_URL}/api/matching/find`, {
            phoneNumber: phoneNumber
        }, {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 60000 // 60 seconds for Claude AI processing
        });

        console.log('✅ Claude AI matching response:', response.data);
        
        if (response.data.success && response.data.matches) {
            updateLoadingText(`Found ${response.data.matches.length} perfect matches!`);
            return response.data.matches;
        } else {
            throw new Error('No matches returned from API');
        }
    } catch (error) {
        console.error('❌ Error with Claude AI matching, falling back to basic search:', error);
        
        // Fallback to basic search if Claude AI fails
        updateLoadingText('Using basic search...');
        return await findMatchesBasic(userData, phoneNumber);
    }
}

async function findMatchesBasic(userData, phoneNumber) {
    console.log('🔍 Using basic matching (fallback)');
    
    // Build multiple search queries for better matching
    const searchQueries = buildSearchQueries(userData);
    console.log('📝 Search queries:', searchQueries);

    const allMatches = [];
    
    // Search with multiple queries to get more results
    for (const query of searchQueries.slice(0, 3)) {
        try {
            updateLoadingText(`Searching: ${query.substring(0, 50)}...`);
            
            const response = await axios.get('https://api.hasdata.com/scrape/google/serp', {
                params: {
                    q: query,
                    location: 'United States',
                    lr: [],
                    deviceType: 'desktop'
                },
                headers: {
                    'x-api-key': HASDATA_API_KEY,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                timeout: 30000
            });

            const data = response.data;
            const matches = extractMatchesFromResponse(data);
            
            // Add matches to collection, avoiding duplicates
            matches.forEach(match => {
                if (!allMatches.find(m => m.link === match.link)) {
                    allMatches.push(match);
                }
            });
            
            // Small delay between requests
            await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
            console.error('Error in search query:', query, error);
        }
    }

    // Score and rank matches
    const scoredMatches = scoreMatches(allMatches, userData);
    
    // Save matches to Firebase
    if (scoredMatches.length > 0) {
        await saveMatchesToFirebase(phoneNumber, userData, scoredMatches);
    }

    return scoredMatches;
}

function buildSearchQueries(userData) {
    const queries = [];
    
    // Base LinkedIn search
    queries.push('linkedin professionals');
    
    if (userData) {
        // Query 1: Name-based search
        if (userData.fullName) {
            queries.push(`linkedin ${userData.fullName}`);
        } else if (userData.firstName && userData.lastName) {
            queries.push(`linkedin ${userData.firstName} ${userData.lastName}`);
        }
        
        // Query 2: Bio keywords search
        if (userData.keywords && userData.keywords.length > 0) {
            const topKeywords = userData.keywords.slice(0, 3).join(' ');
            queries.push(`linkedin ${topKeywords}`);
        }
        
        // Query 3: Interests-based search
        if (userData.interests && userData.interests.length > 0) {
            const topInterests = userData.interests.slice(0, 2).join(' ');
            queries.push(`linkedin ${topInterests}`);
        }
        
        // Query 4: Skills-based search
        if (userData.skills && userData.skills.length > 0) {
            const topSkills = userData.skills.slice(0, 2).join(' ');
            queries.push(`linkedin ${topSkills}`);
        }
        
        // Query 5: Bio-based search
        if (userData.bio) {
            const bioWords = userData.bio.split(' ').filter(w => w.length > 4).slice(0, 3).join(' ');
            if (bioWords) {
                queries.push(`linkedin ${bioWords}`);
            }
        }
    }
    
    // Remove duplicates and return
    return [...new Set(queries)];
}

function scoreMatches(matches, userData) {
    if (!userData) return matches;
    
    return matches.map(match => {
        let score = 0;
        
        // Score based on title relevance
        if (userData.fullName || userData.firstName) {
            const name = (userData.fullName || `${userData.firstName} ${userData.lastName}`).toLowerCase();
            if (match.title.toLowerCase().includes(name.split(' ')[0])) {
                score += 10;
            }
        }
        
        // Score based on keywords in snippet
        if (userData.keywords && match.snippet) {
            const snippetLower = match.snippet.toLowerCase();
            userData.keywords.forEach(keyword => {
                if (snippetLower.includes(keyword.toLowerCase())) {
                    score += 5;
                }
            });
        }
        
        // Score based on interests
        if (userData.interests && match.snippet) {
            const snippetLower = match.snippet.toLowerCase();
            userData.interests.forEach(interest => {
                if (snippetLower.includes(interest.toLowerCase())) {
                    score += 3;
                }
            });
        }
        
        // Score based on skills
        if (userData.skills && match.snippet) {
            const snippetLower = match.snippet.toLowerCase();
            userData.skills.forEach(skill => {
                if (snippetLower.includes(skill.toLowerCase())) {
                    score += 3;
                }
            });
        }
        
        return { ...match, score };
    }).sort((a, b) => b.score - a.score); // Sort by score descending
}

function ensureMinimumMatches(matches, userData) {
    // If we have less than 5 matches, do additional searches
    if (matches.length < 5) {
        console.log(`⚠️ Only ${matches.length} matches found, need at least 5`);
        
        // Try generic LinkedIn searches to fill up
        const additionalQueries = [
            'linkedin professionals network',
            'linkedin connections',
            'linkedin people',
            'linkedin profiles'
        ];
        
        // Note: In a real implementation, you'd make additional API calls here
        // For now, we'll use what we have and pad with generic results if needed
    }
    
    // Return top 5-8 matches
    return matches.slice(0, 8);
}

function extractMatchesFromResponse(data) {
    const matches = [];
    
    // Extract from organicResults
    if (data?.organicResults && Array.isArray(data.organicResults)) {
        data.organicResults.forEach((result, index) => {
            if (result.link && result.link.includes('linkedin.com')) {
                matches.push({
                    title: result.title || 'LinkedIn Profile',
                    link: result.link,
                    snippet: result.snippet || '',
                    thumbnail: result.thumbnail || null,
                    position: result.position || index + 1
                });
            }
        });
    }
    
    // Extract from organic_results (alternative format)
    if (data?.organic_results && Array.isArray(data.organic_results)) {
        data.organic_results.forEach((result, index) => {
            if (result.link && result.link.includes('linkedin.com')) {
                matches.push({
                    title: result.title || 'LinkedIn Profile',
                    link: result.link,
                    snippet: result.snippet || '',
                    thumbnail: result.thumbnail || null,
                    position: result.position || index + 1
                });
            }
        });
    }
    
    // Extract from inline_images if available
    if (data?.inline_images && Array.isArray(data.inline_images)) {
        data.inline_images.forEach((img, index) => {
            if (img.link && img.link.includes('linkedin.com')) {
                matches.push({
                    title: img.title || 'LinkedIn Profile',
                    link: img.link,
                    snippet: '',
                    thumbnail: img.thumbnail || img.thumbnail_link || null,
                    position: index + 1
                });
            }
        });
    }

    return matches;
}

async function saveMatchesToFirebase(phoneNumber, userData, matches) {
    try {
        if (!window.firebase || !window.firebase.db) {
            console.warn('Firebase not initialized');
            return;
        }

        const { collection, addDoc, serverTimestamp } = window.firebase;
        
        const matchData = {
            phoneNumber: phoneNumber,
            userData: userData,
            matches: matches,
            matchCount: matches.length,
            timestamp: serverTimestamp(),
            createdAt: new Date().toISOString(),
            type: 'user_matches'
        };

        await addDoc(collection(window.firebase.db, 'user_matches'), matchData);
        console.log('✅ Matches saved to Firebase');
    } catch (error) {
        console.error('Error saving matches to Firebase:', error);
    }
}

function displayMatches(matches) {
    const orbitalContainer = document.getElementById('orbitalContainer');
    if (!orbitalContainer) return;

    // Clear existing content
    orbitalContainer.innerHTML = '';

    if (matches.length === 0) {
        return;
    }

    // Sort matches by score (highest to lowest)
    const sortedMatches = [...matches].sort((a, b) => {
        const scoreA = a.score || 0;
        const scoreB = b.score || 0;
        return scoreB - scoreA;
    });
    
    console.log('📊 Matches sorted by score:', sortedMatches.map(m => ({ name: m.name, score: m.score || 0 })));
    
    // Create floating avatars in Apple-style prototype design
    sortedMatches.forEach((match, index) => {
        setTimeout(() => {
            createFloatingAvatar(orbitalContainer, match, index, sortedMatches.length);
        }, index * 100);
    });
}

/**
 * Calculate orbits based on match scores
 * Highest scores = inner orbits (closer to center, like planets near the sun)
 * Lower scores = outer orbits (farther from center)
 */
function calculateOrbitsByScore(matches) {
    if (matches.length === 0) return [];
    
    // Define orbit configuration
    // Inner orbits (1-3) are for highest scores, outer orbits (4-6) for lower scores
    const orbitConfigs = [
        { orbitNumber: 1, baseRadius: 180, minScore: 90, maxPerOrbit: 4, duration: 20, direction: 'normal' },      // Inner - highest scores
        { orbitNumber: 2, baseRadius: 240, minScore: 80, maxPerOrbit: 5, duration: 25, direction: 'reverse' },    // Second ring
        { orbitNumber: 3, baseRadius: 300, minScore: 70, maxPerOrbit: 6, duration: 30, direction: 'normal' },      // Third ring
        { orbitNumber: 4, baseRadius: 360, minScore: 60, maxPerOrbit: 7, duration: 35, direction: 'reverse' },     // Fourth ring
        { orbitNumber: 5, baseRadius: 420, minScore: 50, maxPerOrbit: 8, duration: 40, direction: 'normal' },    // Fifth ring
        { orbitNumber: 6, baseRadius: 480, minScore: 0, maxPerOrbit: 10, duration: 45, direction: 'reverse' }     // Outer - lowest scores
    ];
    
    const assignments = [];
    const orbitCounts = {}; // Track how many avatars in each orbit
    
    matches.forEach((match, index) => {
        const score = match.score || 0;
        
        // Find appropriate orbit based on score
        let selectedOrbit = orbitConfigs[orbitConfigs.length - 1]; // Default to outer orbit
        
        for (const orbitConfig of orbitConfigs) {
            if (score >= orbitConfig.minScore) {
                // Check if orbit has space
                const currentCount = orbitCounts[orbitConfig.orbitNumber] || 0;
                if (currentCount < orbitConfig.maxPerOrbit) {
                    selectedOrbit = orbitConfig;
                    break;
                }
            }
        }
        
        // If selected orbit is full, find next available orbit
        const currentCount = orbitCounts[selectedOrbit.orbitNumber] || 0;
        if (currentCount >= selectedOrbit.maxPerOrbit) {
            // Find next orbit with space
            for (const orbitConfig of orbitConfigs) {
                const count = orbitCounts[orbitConfig.orbitNumber] || 0;
                if (count < orbitConfig.maxPerOrbit) {
                    selectedOrbit = orbitConfig;
                    break;
                }
            }
        }
        
        // Update orbit count
        orbitCounts[selectedOrbit.orbitNumber] = (orbitCounts[selectedOrbit.orbitNumber] || 0) + 1;
        
        // Calculate angle - distribute evenly around the orbit
        const avatarsInOrbit = orbitCounts[selectedOrbit.orbitNumber];
        const angle = (360 / avatarsInOrbit) * (avatarsInOrbit - 1);
        
        assignments.push({
            orbitNumber: selectedOrbit.orbitNumber,
            radius: selectedOrbit.baseRadius,
            angle: angle,
            duration: selectedOrbit.duration,
            direction: selectedOrbit.direction,
            score: score
        });
    });
    
    // Recalculate angles for each orbit to distribute evenly
    const orbitGroups = {};
    assignments.forEach((assignment, index) => {
        const orbitNum = assignment.orbitNumber;
        if (!orbitGroups[orbitNum]) {
            orbitGroups[orbitNum] = [];
        }
        orbitGroups[orbitNum].push({ index, assignment });
    });
    
    // Redistribute angles evenly within each orbit
    Object.keys(orbitGroups).forEach(orbitNum => {
        const group = orbitGroups[orbitNum];
        group.forEach((item, idx) => {
            const angle = (360 / group.length) * idx;
            assignments[item.index].angle = angle;
        });
    });
    
    return assignments;
}

function getOrCreateOrbit(container, orbitNumber, radius, duration, direction) {
    let orbit = container.querySelector(`.orbit-${orbitNumber}`);
    
    if (!orbit) {
        orbit = document.createElement('div');
        orbit.className = `orbital-orbit orbit-${orbitNumber}`;
        
        // Use provided radius, duration, and direction (from score-based calculation)
        const size = radius * 2; // Diameter
        
        orbit.style.width = `${size}px`;
        orbit.style.height = `${size}px`;
        orbit.style.animation = `rotate ${duration}s linear infinite ${direction || (orbitNumber % 2 === 0 ? 'reverse' : 'normal')}`;
        orbit.style.animationPlayState = 'running';
        
        // Add visual orbit path (optional - can be toggled)
        orbit.setAttribute('data-orbit-number', orbitNumber);
        orbit.setAttribute('data-radius', radius);
        orbit.setAttribute('data-duration', duration);
        orbit.setAttribute('data-direction', direction || (orbitNumber % 2 === 0 ? 'reverse' : 'normal'));
        
        container.appendChild(orbit);
    }
    
    return orbit;
}

/**
 * Create a clean match card with AI avatar
 */
function createMatchCard(match, index) {
    const card = document.createElement('div');
    card.className = 'match-card';
    card.style.cssText = `
        position: relative;
        background: white;
        border-radius: 12px;
        padding: 1.5rem;
        cursor: pointer;
        transition: all 0.3s ease;
        border: 1px solid #e5e5e5;
        box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    `;
    
    // Generate AI avatar URL using UI Avatars or similar service
    const name = match.name || 'User';
    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=120&background=random&bold=true&color=fff`;
    
    // Avatar
    const avatar = document.createElement('div');
    avatar.className = 'match-avatar';
    avatar.style.cssText = `
        width: 120px;
        height: 120px;
        border-radius: 8px;
        margin: 0 auto 1rem;
        overflow: hidden;
        background: #f5f5f5;
    `;
    
    const avatarImg = document.createElement('img');
    avatarImg.src = avatarUrl;
    avatarImg.alt = name;
    avatarImg.style.cssText = `
        width: 100%;
        height: 100%;
        object-fit: cover;
    `;
    avatarImg.onerror = function() {
        // Fallback to colored background with initials
        this.style.display = 'none';
        avatar.style.background = match.avatarColor || '#007AFF';
        avatar.innerHTML = `<div style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; color: white; font-size: 2rem; font-weight: 600;">${match.initials || name.substring(0, 2).toUpperCase()}</div>`;
    };
    avatar.appendChild(avatarImg);
    
    // Name
    const nameEl = document.createElement('h3');
    nameEl.className = 'match-name';
    nameEl.textContent = name;
    nameEl.style.cssText = `
        font-size: 1.1rem;
        font-weight: 600;
        margin: 0 0 0.5rem;
        color: #000;
        text-align: center;
    `;
    
    // Title
    const titleEl = document.createElement('p');
    titleEl.className = 'match-title';
    titleEl.textContent = match.title || match.profession || '';
    titleEl.style.cssText = `
        font-size: 0.85rem;
        color: #666;
        margin: 0 0 0.5rem;
        text-align: center;
    `;
    
    // Score badge
    if (match.score) {
        const scoreEl = document.createElement('div');
        scoreEl.className = 'match-score-badge';
        scoreEl.textContent = `${match.score}% match`;
        scoreEl.style.cssText = `
            display: inline-block;
            background: #007AFF;
            color: white;
            padding: 0.25rem 0.75rem;
            border-radius: 12px;
            font-size: 0.75rem;
            font-weight: 600;
            margin: 0.5rem auto 0;
            text-align: center;
            display: block;
            width: fit-content;
        `;
        card.appendChild(scoreEl);
    }
    
    // Info panel (hidden by default, shown on hover/click)
    const infoPanel = document.createElement('div');
    infoPanel.className = 'match-info-panel';
    infoPanel.style.cssText = `
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        background: white;
        border-radius: 12px;
        padding: 1.5rem;
        margin-top: 0.5rem;
        box-shadow: 0 8px 24px rgba(0,0,0,0.15);
        opacity: 0;
        visibility: hidden;
        transform: translateY(-10px);
        transition: all 0.3s ease;
        z-index: 100;
        border: 1px solid #e5e5e5;
        max-height: 400px;
        overflow-y: auto;
    `;
    
    // Build info content
    let infoHTML = '';
    if (match.bio) {
        infoHTML += `<p style="font-size: 0.9rem; color: #333; line-height: 1.6; margin: 0 0 1rem;">${escapeHtml(match.bio)}</p>`;
    }
    if (match.location) {
        infoHTML += `<p style="font-size: 0.85rem; color: #666; margin: 0 0 0.5rem;"><strong>Location:</strong> ${escapeHtml(match.location)}</p>`;
    }
    if (match.company) {
        infoHTML += `<p style="font-size: 0.85rem; color: #666; margin: 0 0 0.5rem;"><strong>Company:</strong> ${escapeHtml(match.company)}</p>`;
    }
    if (match.skills && match.skills.length > 0) {
        infoHTML += `<p style="font-size: 0.85rem; color: #666; margin: 0 0 0.5rem;"><strong>Skills:</strong> ${escapeHtml(match.skills.slice(0, 3).join(', '))}</p>`;
    }
    if (match.matchReason) {
        infoHTML += `<p style="font-size: 0.8rem; color: #999; font-style: italic; margin: 1rem 0 0; padding-top: 1rem; border-top: 1px solid #e5e5e5;">${escapeHtml(match.matchReason)}</p>`;
    }
    if (match.linkedin) {
        infoHTML += `<a href="${escapeHtml(match.linkedin)}" target="_blank" rel="noopener noreferrer" style="display: inline-block; margin-top: 1rem; color: #007AFF; text-decoration: none; font-weight: 500; font-size: 0.9rem;">View LinkedIn Profile →</a>`;
    }
    
    infoPanel.innerHTML = infoHTML;
    
    // Assemble card
    card.appendChild(avatar);
    card.appendChild(nameEl);
    card.appendChild(titleEl);
    card.appendChild(infoPanel);
    
    // Hover/Click handlers
    let isInfoVisible = false;
    
    const showInfo = () => {
        isInfoVisible = true;
        infoPanel.style.opacity = '1';
        infoPanel.style.visibility = 'visible';
        infoPanel.style.transform = 'translateY(0)';
        card.style.zIndex = '10';
        card.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)';
    };
    
    const hideInfo = () => {
        isInfoVisible = false;
        infoPanel.style.opacity = '0';
        infoPanel.style.visibility = 'hidden';
        infoPanel.style.transform = 'translateY(-10px)';
        card.style.zIndex = '1';
        card.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)';
    };
    
    card.addEventListener('mouseenter', showInfo);
    card.addEventListener('mouseleave', hideInfo);
    card.addEventListener('click', (e) => {
        if (e.target.tagName !== 'A') {
            if (isInfoVisible) {
                hideInfo();
            } else {
                showInfo();
            }
        }
    });
    
    return card;
}

/**
 * Create Apple-style floating avatar that opens Google search on click
 */
function createFloatingAvatar(container, match, index, totalMatches) {
    const avatar = document.createElement('div');
    avatar.className = 'floating-avatar';
    
    // Generate AI avatar URL
    const name = match.name || 'User';
    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=120&background=random&bold=true&color=fff&rounded=true`;
    
    // Calculate position for floating effect (Apple-style scattered around screen)
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Avoid center area (where user avatar is)
    const centerRadius = 120;
    const minDistance = centerRadius + 100;
    const maxDistance = Math.min(viewportWidth, viewportHeight) * 0.45;
    
    // Distribute avatars in a scattered circular pattern
    const angle = (360 / totalMatches) * index + (Math.random() * 20 - 10); // Add slight randomness
    const distance = minDistance + (Math.random() * (maxDistance - minDistance));
    const x = Math.cos(angle * Math.PI / 180) * distance;
    const y = Math.sin(angle * Math.PI / 180) * distance;
    
    // Center position (screen center)
    const centerX = viewportWidth / 2;
    const centerY = viewportHeight / 2;
    
    // Final position with bounds checking
    let finalX = centerX + x;
    let finalY = centerY + y;
    
    // Keep avatars within viewport bounds
    finalX = Math.max(60, Math.min(viewportWidth - 60, finalX));
    finalY = Math.max(100, Math.min(viewportHeight - 100, finalY));
    
    // Set initial position
    avatar.style.cssText = `
        position: fixed;
        left: ${finalX}px;
        top: ${finalY}px;
        width: 80px;
        height: 80px;
        border-radius: 50%;
        cursor: pointer;
        transform: translate(-50%, -50%);
        opacity: 0;
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        z-index: 10;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
        border: 3px solid white;
        background: white;
        overflow: hidden;
    `;
    
    // Create avatar image
    const avatarImg = document.createElement('img');
    avatarImg.src = avatarUrl;
    avatarImg.alt = name;
    avatarImg.style.cssText = `
        width: 100%;
        height: 100%;
        object-fit: cover;
        border-radius: 50%;
    `;
    
    // Fallback to colored background with initials
    avatarImg.onerror = function() {
        const avatarColor = match.avatarColor || generateColorFromName(name);
        const initials = match.initials || getInitialsFromName(name);
        avatar.style.background = `linear-gradient(135deg, ${avatarColor} 0%, ${darkenColor(avatarColor, 10)} 100%)`;
        avatar.innerHTML = `<div style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; color: white; font-size: 1.5rem; font-weight: 600;">${initials}</div>`;
    };
    
    avatar.appendChild(avatarImg);
    
    // Score badge
    if (match.score) {
        const scoreBadge = document.createElement('div');
        scoreBadge.className = 'avatar-score-badge';
        scoreBadge.textContent = `${match.score}%`;
        scoreBadge.style.cssText = `
            position: absolute;
            bottom: -8px;
            right: -8px;
            background: #007AFF;
            color: white;
            font-size: 0.65rem;
            font-weight: 600;
            padding: 0.2rem 0.4rem;
            border-radius: 8px;
            border: 2px solid white;
            z-index: 11;
        `;
        avatar.appendChild(scoreBadge);
    }
    
    // Floating animation
    const floatAnimation = () => {
        const randomX = (Math.random() - 0.5) * 20;
        const randomY = (Math.random() - 0.5) * 20;
        avatar.style.transform = `translate(calc(-50% + ${randomX}px), calc(-50% + ${randomY}px))`;
    };
    
    // Animate on load
    setTimeout(() => {
        avatar.style.opacity = '1';
        avatar.style.transform = `translate(-50%, -50%) scale(1)`;
    }, index * 100);
    
    // Continuous floating animation (subtle movement)
    let floatInterval = setInterval(() => {
        const randomX = (Math.random() - 0.5) * 15;
        const randomY = (Math.random() - 0.5) * 15;
        const currentX = parseFloat(avatar.style.left) || finalX;
        const currentY = parseFloat(avatar.style.top) || finalY;
        
        // Smooth transition to new position
        avatar.style.transition = 'transform 3s ease-in-out';
        avatar.style.transform = `translate(calc(-50% + ${randomX}px), calc(-50% + ${randomY}px))`;
    }, 3000 + Math.random() * 2000);
    
    // Reset transform on hover
    avatar.addEventListener('mouseenter', () => {
        avatar.style.transition = 'transform 0.3s ease';
    });
    
    // Hover effect
    avatar.addEventListener('mouseenter', () => {
        avatar.style.transform = 'translate(-50%, -50%) scale(1.15)';
        avatar.style.zIndex = '20';
        avatar.style.boxShadow = '0 12px 32px rgba(0, 0, 0, 0.25)';
    });
    
    avatar.addEventListener('mouseleave', () => {
        avatar.style.transform = 'translate(-50%, -50%) scale(1)';
        avatar.style.zIndex = '10';
        avatar.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.15)';
    });
    
    // Click handler - open Google search with person's info
    avatar.addEventListener('click', () => {
        // Build search query with person's full info + LinkedIn
        const searchTerms = [];
        
        if (match.name) searchTerms.push(match.name);
        if (match.title) searchTerms.push(match.title);
        if (match.company) searchTerms.push(match.company);
        if (match.location) searchTerms.push(match.location);
        if (match.profession) searchTerms.push(match.profession);
        if (match.skills && match.skills.length > 0) {
            searchTerms.push(...match.skills.slice(0, 2));
        }
        if (match.linkedin) searchTerms.push('LinkedIn');
        
        const searchQuery = searchTerms.join(' ');
        const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;
        
        // Open Google search in new tab
        window.open(googleSearchUrl, '_blank', 'noopener,noreferrer');
        
        // Show info panel briefly
        showAvatarInfo(avatar, match);
    });
    
    container.appendChild(avatar);
    
    // Store position data for resize handling
    avatar.dataset.initialX = finalX;
    avatar.dataset.initialY = finalY;
    avatar.dataset.angle = angle;
    avatar.dataset.distance = distance;
}

// Handle window resize - reposition floating avatars
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        const avatars = document.querySelectorAll('.floating-avatar');
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const centerX = viewportWidth / 2;
        const centerY = viewportHeight / 2;
        
        avatars.forEach(avatar => {
            const angle = parseFloat(avatar.dataset.angle) || 0;
            const distance = parseFloat(avatar.dataset.distance) || 200;
            const x = Math.cos(angle * Math.PI / 180) * distance;
            const y = Math.sin(angle * Math.PI / 180) * distance;
            
            let finalX = centerX + x;
            let finalY = centerY + y;
            
            // Keep within bounds
            finalX = Math.max(60, Math.min(viewportWidth - 60, finalX));
            finalY = Math.max(100, Math.min(viewportHeight - 100, finalY));
            
            avatar.style.left = `${finalX}px`;
            avatar.style.top = `${finalY}px`;
        });
    }, 250);
});

/**
 * Show avatar info panel on click
 */
function showAvatarInfo(avatarElement, match) {
    // Remove existing info panel if any
    const existingInfo = document.querySelector('.avatar-info-panel');
    if (existingInfo) {
        existingInfo.remove();
    }
    
    const infoPanel = document.createElement('div');
    infoPanel.className = 'avatar-info-panel';
    
    const rect = avatarElement.getBoundingClientRect();
    const panelX = rect.left + rect.width / 2;
    const panelY = rect.top + rect.height / 2;
    
    infoPanel.style.cssText = `
        position: fixed;
        left: ${panelX}px;
        top: ${panelY}px;
        transform: translate(-50%, -50%);
        background: white;
        border-radius: 16px;
        padding: 1.5rem;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        z-index: 1000;
        min-width: 300px;
        max-width: 400px;
        opacity: 0;
        pointer-events: none;
        border: 1px solid rgba(0, 0, 0, 0.1);
    `;
    
    let infoHTML = `
        <div style="text-align: center; margin-bottom: 1rem;">
            <h3 style="font-size: 1.2rem; font-weight: 600; margin: 0 0 0.5rem; color: #000;">${escapeHtml(match.name || 'Unknown')}</h3>
            ${match.title ? `<p style="font-size: 0.9rem; color: #666; margin: 0;">${escapeHtml(match.title)}</p>` : ''}
        </div>
    `;
    
    if (match.bio) {
        infoHTML += `<p style="font-size: 0.85rem; color: #333; line-height: 1.6; margin: 0 0 1rem;">${escapeHtml(match.bio)}</p>`;
    }
    
    if (match.location) {
        infoHTML += `<p style="font-size: 0.8rem; color: #666; margin: 0 0 0.5rem;"><strong>Location:</strong> ${escapeHtml(match.location)}</p>`;
    }
    
    if (match.company) {
        infoHTML += `<p style="font-size: 0.8rem; color: #666; margin: 0 0 0.5rem;"><strong>Company:</strong> ${escapeHtml(match.company)}</p>`;
    }
    
    if (match.skills && match.skills.length > 0) {
        infoHTML += `<p style="font-size: 0.8rem; color: #666; margin: 0 0 1rem;"><strong>Skills:</strong> ${escapeHtml(match.skills.slice(0, 5).join(', '))}</p>`;
    }
    
    if (match.linkedin) {
        infoHTML += `<a href="${escapeHtml(match.linkedin)}" target="_blank" rel="noopener noreferrer" style="display: block; text-align: center; color: #007AFF; text-decoration: none; font-weight: 500; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #e5e5e5;">View LinkedIn Profile →</a>`;
    }
    
    infoHTML += `<p style="font-size: 0.75rem; color: #999; text-align: center; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #e5e5e5;">Clicking avatar opens Google search</p>`;
    
    infoPanel.innerHTML = infoHTML;
    document.body.appendChild(infoPanel);
    
    // Animate in
    setTimeout(() => {
        infoPanel.style.opacity = '1';
        infoPanel.style.transition = 'opacity 0.3s ease';
    }, 10);
    
    // Auto-close after 5 seconds
    setTimeout(() => {
        infoPanel.style.opacity = '0';
        setTimeout(() => {
            infoPanel.remove();
        }, 300);
    }, 5000);
    
    // Close on click outside
    const closeOnClick = (e) => {
        if (!infoPanel.contains(e.target) && e.target !== avatarElement) {
            infoPanel.style.opacity = '0';
            setTimeout(() => {
                infoPanel.remove();
            }, 300);
            document.removeEventListener('click', closeOnClick);
        }
    };
    setTimeout(() => {
        document.addEventListener('click', closeOnClick);
    }, 100);
}

function createAvatar(orbit, match, angle, orbitNumber, radius) {
    const wrapper = document.createElement('div');
    wrapper.className = 'avatar-wrapper';
    wrapper.setAttribute('data-score', match.score || 0);
    wrapper.setAttribute('data-orbit', orbitNumber);
    
    // Calculate position based on radius (distance from center)
    const radiusPx = radius || (orbit.offsetWidth / 2);
    wrapper.style.transform = `translate(-50%, -50%) rotate(${angle}deg) translateY(-${radiusPx}px) rotate(-${angle}deg)`;
    wrapper.style.opacity = '0';
    
    // Staggered fade-in animation based on orbit (inner orbits appear first)
    const animationDelay = (6 - orbitNumber) * 0.1;
    wrapper.style.animation = `fadeInScale 0.8s cubic-bezier(0.4, 0, 0.2, 1) ${animationDelay}s forwards`;
    
    // Add score-based visual indicator
    if (match.score) {
        wrapper.setAttribute('title', `${match.name || 'Match'}: ${match.score}% match`);
    }
    
    const circle = document.createElement('div');
    circle.className = 'avatar-circle';
    
    // Generate AI avatar URL
    const name = match.name || 'User';
    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=140&background=random&bold=true&color=fff&rounded=true`;
    
    // Create avatar image container
    const imageContainer = document.createElement('div');
    imageContainer.className = 'avatar-image';
    
    // Add AI avatar image
    const avatarImg = document.createElement('img');
    avatarImg.src = avatarUrl;
    avatarImg.alt = name;
    avatarImg.style.cssText = `
        width: 100%;
        height: 100%;
        object-fit: cover;
        border-radius: 50%;
    `;
    
    // Fallback to colored background with initials if image fails
    avatarImg.onerror = function() {
        const avatarColor = match.avatarColor || generateColorFromName(name);
        const initials = match.initials || getInitialsFromName(name);
        imageContainer.style.background = `linear-gradient(135deg, ${avatarColor} 0%, ${darkenColor(avatarColor, 10)} 100%)`;
        imageContainer.innerHTML = `<div class="avatar-initials">${initials}</div>`;
    };
    
    imageContainer.appendChild(avatarImg);
    
    // Add subtle glow effect
    const score = match.score || 0;
    const glowIntensity = Math.min(100, score) / 100;
    circle.style.boxShadow = `
        0 0 0 3px rgba(0, 122, 255, ${0.1 + glowIntensity * 0.2}),
        0 8px 32px rgba(0, 122, 255, ${0.2 + glowIntensity * 0.3}),
        0 0 60px rgba(0, 122, 255, ${0.1 + glowIntensity * 0.2})
    `;
    
    circle.style.transition = 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
    circle.style.border = '3px solid white';
    circle.style.background = 'white';
    
    circle.appendChild(imageContainer);
    wrapper.appendChild(circle);
    
    // Avatar info
    const info = document.createElement('div');
    info.className = 'avatar-info';
    
    const name = match.name || match.title.split(' - ')[0].split(' | ')[0].split(' at ')[0].trim();
    const title = match.title || match.snippet || 'Professional';
    const bio = match.bio || match.snippet || '';
    const profession = match.profession || '';
    const score = match.score || 0;
    const reason = match.matchReason || '';
    
    info.innerHTML = `
        <div class="avatar-header">
            <h3>${escapeHtml(name)}</h3>
            ${score > 0 ? `<div class="match-score">${score}% match</div>` : ''}
        </div>
        <p class="avatar-title">${escapeHtml(title)}</p>
        ${bio ? `<p class="avatar-bio">${escapeHtml(bio.substring(0, 120))}${bio.length > 120 ? '...' : ''}</p>` : ''}
        ${profession ? `<div class="avatar-badge">${escapeHtml(profession)}</div>` : ''}
        ${reason ? `<p class="match-reason">${escapeHtml(reason)}</p>` : ''}
        ${match.linkedin ? `<a href="${escapeHtml(match.linkedin)}" target="_blank" class="avatar-link" rel="noopener noreferrer">View Profile →</a>` : ''}
    `;
    
    wrapper.appendChild(info);
    
    // Add interactive hover effects with score-based glow intensity
    wrapper.addEventListener('mouseenter', () => {
        wrapper.style.zIndex = '20';
        const score = match.score || 0;
        const glowIntensity = Math.min(100, score) / 100; // Higher score = brighter glow
        const glowColor = `${avatarColor}${Math.floor(80 + (glowIntensity * 40))}`; // Brighter for higher scores
        circle.style.transform = 'scale(1.25)';
        circle.style.boxShadow = `
            0 0 0 3px ${avatarColor}${Math.floor(30 + (glowIntensity * 20))},
            0 12px 48px ${glowColor},
            0 0 ${80 + (glowIntensity * 40)}px ${avatarColor}${Math.floor(40 + (glowIntensity * 20))},
            inset 0 0 30px ${avatarColor}${Math.floor(15 + (glowIntensity * 10))}
        `;
        info.style.opacity = '1';
        info.style.visibility = 'visible';
        info.style.transform = 'translateX(-50%) translateY(-8px)';
        
        // Pause orbit animation on hover for better interaction
        orbit.style.animationPlayState = 'paused';
    });
    
    wrapper.addEventListener('mouseleave', () => {
        wrapper.style.zIndex = '10';
        const score = match.score || 0;
        const glowIntensity = Math.min(100, score) / 100;
        const glowColor = `${avatarColor}${Math.floor(40 + (glowIntensity * 20))}`;
        circle.style.transform = 'scale(1)';
        circle.style.boxShadow = `
            0 0 0 2px ${avatarColor}${Math.floor(20 + (glowIntensity * 10))},
            0 8px 32px ${glowColor},
            0 0 ${60 + (glowIntensity * 20)}px ${avatarColor}${Math.floor(30 + (glowIntensity * 10))},
            inset 0 0 20px ${avatarColor}${Math.floor(10 + (glowIntensity * 5))}
        `;
        
        // Resume orbit animation
        orbit.style.animationPlayState = 'running';
    });
    
    // Add click animation
    wrapper.addEventListener('mousedown', () => {
        circle.style.transform = 'scale(1.1)';
    });
    
    wrapper.addEventListener('mouseup', () => {
        circle.style.transform = 'scale(1.2)';
    });
    
    // Click to open profile
    wrapper.addEventListener('click', () => {
        if (match.linkedin) {
            window.open(match.linkedin, '_blank', 'noopener,noreferrer');
        } else if (match.link) {
            window.open(match.link, '_blank', 'noopener,noreferrer');
        }
    });
    
    orbit.appendChild(wrapper);
}

function generateColorFromName(name) {
    // Generate beautiful, vibrant colors
    const colors = [
        '#FF6B9D', '#C44569', '#F8B500', '#6C5CE7', '#00D2D3',
        '#FF6348', '#5352ED', '#FFA502', '#2ED573', '#1E90FF',
        '#FF4757', '#5F27CD', '#00D2FF', '#FF6348', '#2ED573',
        '#FF6B9D', '#5F27CD', '#00D2FF', '#FFA502', '#1E90FF'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
}

function darkenColor(color, percent) {
    const num = parseInt(color.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.max(0, Math.min(255, (num >> 16) - amt));
    const G = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) - amt));
    const B = Math.max(0, Math.min(255, (num & 0x0000FF) - amt));
    return "#" + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
}

function lightenColor(color, percent) {
    const num = parseInt(color.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.min(255, Math.max(0, (num >> 16) + amt));
    const G = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amt));
    const B = Math.min(255, Math.max(0, (num & 0x0000FF) + amt));
    return "#" + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
}

function getInitialsFromName(name) {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
}

function getDefaultAvatarSVG() {
    return `
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
            <path d="M12 8C13.1 8 14 8.9 14 10C14 11.1 13.1 12 12 12C10.9 12 10 11.1 10 10C10 8.9 10.9 8 12 8Z" fill="currentColor"/>
            <path d="M12 14C14.67 14 20 15.33 20 18V20H4V18C4 15.33 9.33 14 12 14Z" fill="currentColor"/>
        </svg>
    `;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function updateLoadingText(text) {
    const loadingText = document.getElementById('loadingText');
    if (loadingText) {
        loadingText.textContent = text;
    }
}

function hideLoading() {
    const loadingIndicator = document.getElementById('loadingIndicator');
    if (loadingIndicator) {
        setTimeout(() => {
            loadingIndicator.style.opacity = '0';
            loadingIndicator.style.transition = 'opacity 0.5s ease';
            setTimeout(() => {
                loadingIndicator.style.display = 'none';
            }, 500);
        }, 500);
    }
}

/**
 * Initialize animation controls (pause/play, speed, reset)
 * NOTE: Removed - no longer using orbital animations
 */
function initializeAnimationControls_DEPRECATED() {
    const pausePlayBtn = document.getElementById('pausePlayBtn');
    const pausePlayIcon = document.getElementById('pausePlayIcon');
    const speedSlider = document.getElementById('speedSlider');
    const speedValue = document.getElementById('speedValue');
    const resetBtn = document.getElementById('resetBtn');
    const orbitalContainer = document.getElementById('orbitalContainer');
    
    let isPaused = false;
    let currentSpeed = 1;
    
    // Pause/Play button
    if (pausePlayBtn && pausePlayIcon) {
        pausePlayBtn.addEventListener('click', () => {
            isPaused = !isPaused;
            const orbits = orbitalContainer.querySelectorAll('.orbital-orbit');
            
            orbits.forEach(orbit => {
                if (isPaused) {
                    orbit.style.animationPlayState = 'paused';
                    pausePlayIcon.textContent = '▶';
                } else {
                    orbit.style.animationPlayState = 'running';
                    pausePlayIcon.textContent = '⏸';
                }
            });
        });
    }
    
    // Speed control
    if (speedSlider && speedValue) {
            speedSlider.addEventListener('input', (e) => {
            currentSpeed = parseFloat(e.target.value);
            speedValue.textContent = `${currentSpeed.toFixed(1)}x`;
            
            const orbits = orbitalContainer.querySelectorAll('.orbital-orbit');
            orbits.forEach(orbit => {
                const baseDuration = parseFloat(orbit.getAttribute('data-duration')) || 30;
                const direction = orbit.getAttribute('data-direction') || 'normal';
                orbit.style.animation = `rotate ${baseDuration / currentSpeed}s linear infinite ${direction}`;
                orbit.style.animationPlayState = isPaused ? 'paused' : 'running';
            });
        });
    }
    
    // Reset button
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            const orbits = orbitalContainer.querySelectorAll('.orbital-orbit');
            orbits.forEach(orbit => {
                orbit.style.animation = 'none';
                // Force reflow
                void orbit.offsetWidth;
                // Restore animation with saved attributes
                const duration = parseFloat(orbit.getAttribute('data-duration')) || 30;
                const direction = orbit.getAttribute('data-direction') || 'normal';
                orbit.style.animation = `rotate ${duration / currentSpeed}s linear infinite ${direction}`;
                orbit.style.animationPlayState = isPaused ? 'paused' : 'running';
            });
        });
    }
}

// Initialize Firebase if not already loaded
if (typeof window.firebase === 'undefined') {
    const checkFirebase = setInterval(() => {
        if (typeof window.firebase !== 'undefined' && window.firebase.db) {
            clearInterval(checkFirebase);
            console.log('✅ Firebase loaded on matching page');
        }
    }, 100);
    
    setTimeout(() => {
        clearInterval(checkFirebase);
        if (typeof window.firebase === 'undefined') {
            console.warn('⚠️ Firebase not loaded, matches will not be saved');
        }
    }, 5000);
}
