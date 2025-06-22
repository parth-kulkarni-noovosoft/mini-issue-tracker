const http = require('http');
const assert = require('assert');

// Configuration
const BASE_URL = 'http://localhost:3000';
let authToken = '';
let teamLeadToken = '';
let userToken = '';
let testTaskId = '';

// Simple HTTP request helper
function makeRequest(method, path, data = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        };

        const req = http.request(url, options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const response = JSON.parse(body);
                    resolve({ status: res.statusCode, data: response });
                } catch (e) {
                    console.log({ errorResponse: body });
                    resolve({ status: res.statusCode, data: body });
                }
            });
        });

        req.on('error', reject);

        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

// Test helper functions
function log(message) {
    console.log(`[${new Date().toISOString()}] ${message}`);
}

function success(testName) {
    console.log(`✅ ${testName} - PASSED`);
}

function fail(testName, error) {
    console.log(`❌ ${testName} - FAILED: ${error}`);
    process.exitCode = 1;
}

// Wait for server to be ready
async function waitForServer() {
    log('Waiting for server to be ready...');
    let attempts = 0;
    while (attempts < 10) {
        try {
            const response = await makeRequest('GET', '/health');
            if (response.status === 200) {
                log('Server is ready!');
                return;
            }
        } catch (e) {
            // Server not ready yet
        }
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    throw new Error('Server did not start in time');
}

// Test functions
async function testHealthCheck() {
    try {
        const response = await makeRequest('GET', '/health');
        assert.strictEqual(response.status, 200);
        assert.strictEqual(response.data.success, true);
        success('Health Check');
    } catch (error) {
        fail('Health Check', error.message);
    }
}

async function testRootEndpoint() {
    try {
        const response = await makeRequest('GET', '/');
        assert.strictEqual(response.status, 200);
        assert.strictEqual(response.data.success, true);
        assert(response.data.endpoints);
        assert(response.data.features);
        success('Root Endpoint');
    } catch (error) {
        fail('Root Endpoint', error.message);
    }
}

// Authentication Tests
async function testLoginAsAdmin() {
    try {
        const response = await makeRequest('POST', '/api/auth/login', {
            email: 'admin@company.com',
            password: 'admin123'
        });
        
        assert.strictEqual(response.status, 200);
        assert.strictEqual(response.data.success, true);
        assert(response.data.data.token);
        assert.strictEqual(response.data.data.user.role, 'ADMIN');
        
        authToken = response.data.data.token;
        success('Login as Admin');
    } catch (error) {
        fail('Login as Admin', error.message);
    }
}

async function testLoginAsTeamLead() {
    try {
        const response = await makeRequest('POST', '/api/auth/login', {
            email: 'jane.smith@company.com',
            password: 'tempPassword123'
        });
        
        assert.strictEqual(response.status, 200);
        assert.strictEqual(response.data.success, true);
        assert(response.data.data.token);
        assert.strictEqual(response.data.data.user.role, 'TEAM_LEAD');
        
        teamLeadToken = response.data.data.token;
        success('Login as Team Lead');
    } catch (error) {
        fail('Login as Team Lead', error.message);
    }
}

async function testLoginAsUser() {
    try {
        const response = await makeRequest('POST', '/api/auth/login', {
            email: 'john.doe@company.com',
            password: 'mypassword123'
        });
        
        assert.strictEqual(response.status, 200);
        assert.strictEqual(response.data.success, true);
        assert(response.data.data.token);
        assert.strictEqual(response.data.data.user.role, 'USER');
        
        userToken = response.data.data.token;
        success('Login as User');
    } catch (error) {
        fail('Login as User', error.message);
    }
}

async function testLoginWithWrongCredentials() {
    try {
        const response = await makeRequest('POST', '/api/auth/login', {
            email: 'admin@company.com',
            password: 'wrongpassword'
        });
        
        assert.strictEqual(response.status, 401);
        assert.strictEqual(response.data.success, false);
        assert.strictEqual(response.data.error.code, 'INVALID_CREDENTIALS');
        success('Login with Wrong Credentials');
    } catch (error) {
        fail('Login with Wrong Credentials', error.message);
    }
}

async function testAuthMe() {
    try {
        const response = await makeRequest('GET', '/api/auth/me', null, {
            'Authorization': `Bearer ${authToken}`
        });
        
        assert.strictEqual(response.status, 200);
        assert.strictEqual(response.data.success, true);
        assert.strictEqual(response.data.data.email, 'admin@company.com');
        success('Auth Me');
    } catch (error) {
        fail('Auth Me', error.message);
    }
}

// Setup Tests - Create required data
// Store team lead ID, team ID, and regular user ID for subsequent operations
let teamLeadUserId = '';
let createdTeamId = '';
let regularUserId = '';

async function testCreateTeamLeadUser() {
    try {
        const response = await makeRequest('POST', '/api/users', {
            email: 'jane.smith@company.com',
            name: 'Jane Smith',
            password: 'tempPassword123',
            role: 'TEAM_LEAD'
            // No team_id yet - will be assigned when team is created
        }, {
            'Authorization': `Bearer ${authToken}`
        });
        
        assert.strictEqual(response.status, 200);
        assert.strictEqual(response.data.success, true);
        assert.strictEqual(response.data.data.email, 'jane.smith@company.com');
        assert.strictEqual(response.data.data.role, 'TEAM_LEAD');
        
        teamLeadUserId = response.data.data.id;
        success('Create Team Lead User');
    } catch (error) {
        fail('Create Team Lead User', error.message);
    }
}

async function testCreateTeam() {
    try {
        const response = await makeRequest('POST', '/api/teams', {
            name: 'Engineering Team',
            description: 'Main engineering team',
            team_lead_id: teamLeadUserId
        }, {
            'Authorization': `Bearer ${authToken}`
        });
        
        assert.strictEqual(response.status, 200);
        assert.strictEqual(response.data.success, true);
        assert.strictEqual(response.data.data.name, 'Engineering Team');
        assert.strictEqual(response.data.data.team_lead_id, teamLeadUserId);
        
        createdTeamId = response.data.data.id;
        success('Create Team');
    } catch (error) {
        fail('Create Team', error.message);
    }
}

async function testCreateRegularUser() {
    try {
        const response = await makeRequest('POST', '/api/users', {
            email: 'john.doe@company.com',
            name: 'John Doe',
            password: 'mypassword123',
            role: 'USER',
            team_id: createdTeamId
        }, {
            'Authorization': `Bearer ${authToken}`
        });
        
        assert.strictEqual(response.status, 200);
        assert.strictEqual(response.data.success, true);
        assert.strictEqual(response.data.data.email, 'john.doe@company.com');
        assert.strictEqual(response.data.data.role, 'USER');
        
        regularUserId = response.data.data.id;
        success('Create Regular User');
    } catch (error) {
        fail('Create Regular User', error.message);
    }
}

// User Management Tests
async function testFetchUsers() {
    try {
        const response = await makeRequest('GET', '/api/users', null, {
            'Authorization': `Bearer ${authToken}`
        });
        
        assert.strictEqual(response.status, 200);
        assert.strictEqual(response.data.success, true);
        assert(Array.isArray(response.data.data));
        assert(response.data.pagination);
        success('Fetch Users');
    } catch (error) {
        fail('Fetch Users', error.message);
    }
}

async function testCreateUser() {
    try {
        const response = await makeRequest('POST', '/api/users', {
            email: 'newuser@company.com',
            name: 'New User',
            password: 'newpass123',
            role: 'USER',
            team_id: createdTeamId
        }, {
            'Authorization': `Bearer ${authToken}`
        });
        
        assert.strictEqual(response.status, 200);
        assert.strictEqual(response.data.success, true);
        assert.strictEqual(response.data.data.email, 'newuser@company.com');
        success('Create User');
    } catch (error) {
        fail('Create User', error.message);
    }
}

async function testCreateDuplicateUser() {
    try {
        const response = await makeRequest('POST', '/api/users', {
            email: 'john.doe@company.com', // Existing email
            name: 'Another User',
            password: 'pass123',
            role: 'USER'
        }, {
            'Authorization': `Bearer ${authToken}`
        });
        
        assert.strictEqual(response.status, 400);
        assert.strictEqual(response.data.success, false);
        assert.strictEqual(response.data.error.code, 'DUPLICATE_EMAIL');
        success('Create Duplicate User');
    } catch (error) {
        fail('Create Duplicate User', error.message);
    }
}

// Team Management Tests
async function testFetchTeams() {
    try {
        const response = await makeRequest('GET', '/api/teams', null, {
            'Authorization': `Bearer ${authToken}`
        });
        
        assert.strictEqual(response.status, 200);
        assert.strictEqual(response.data.success, true);
        assert(Array.isArray(response.data.data));
        success('Fetch Teams');
    } catch (error) {
        fail('Fetch Teams', error.message);
    }
}

async function testFetchTeamMembers() {
    try {
        const response = await makeRequest('GET', `/api/teams/${createdTeamId}/members`, null, {
            'Authorization': `Bearer ${authToken}`
        });
        
        assert.strictEqual(response.status, 200);
        assert.strictEqual(response.data.success, true);
        assert(response.data.data.team);
        assert(Array.isArray(response.data.data.members));
        success('Fetch Team Members');
    } catch (error) {
        fail('Fetch Team Members', error.message);
    }
}

// Task Management Tests
async function testFetchTasks() {
    try {
        const response = await makeRequest('GET', '/api/tasks', null, {
            'Authorization': `Bearer ${authToken}`
        });
        
        assert.strictEqual(response.status, 200);
        assert.strictEqual(response.data.success, true);
        assert(Array.isArray(response.data.data));
        success('Fetch Tasks');
    } catch (error) {
        fail('Fetch Tasks', error.message);
    }
}

async function testCreateTask() {
    try {
        const response = await makeRequest('POST', '/api/tasks', {
            title: 'Test Task',
            description: 'This is a test task',
            priority: 'MEDIUM',
            assignee_id: regularUserId,
            team_id: createdTeamId,
            estimated_hours: 2,
            due_date: '2024-12-31'
        }, {
            'Authorization': `Bearer ${teamLeadToken}`
        });
        
        assert.strictEqual(response.status, 200);
        assert.strictEqual(response.data.success, true);
        assert.strictEqual(response.data.data.title, 'Test Task');
        assert.strictEqual(response.data.data.status, 'TODO');
        
        testTaskId = response.data.data.id;
        success('Create Task');
    } catch (error) {
        fail('Create Task', error.message);
    }
}

async function testUpdateTaskStatus() {
    try {
        const response = await makeRequest('PUT', `/api/tasks/${testTaskId}`, {
            status: 'IN_PROGRESS'
        }, {
            'Authorization': `Bearer ${userToken}`
        });
        
        assert.strictEqual(response.status, 200);
        assert.strictEqual(response.data.success, true);
        assert.strictEqual(response.data.data.status, 'IN_PROGRESS');
        success('Update Task Status');
    } catch (error) {
        fail('Update Task Status', error.message);
    }
}

async function testInvalidStatusTransition() {
    try {
        const response = await makeRequest('PUT', `/api/tasks/${testTaskId}`, {
            status: 'DONE' // Invalid transition from IN_PROGRESS to DONE
        }, {
            'Authorization': `Bearer ${userToken}`
        });
        
        assert.strictEqual(response.status, 400);
        assert.strictEqual(response.data.success, false);
        assert.strictEqual(response.data.error.code, 'INVALID_TRANSITION');
        success('Invalid Status Transition');
    } catch (error) {
        fail('Invalid Status Transition', error.message);
    }
}

async function testFetchSingleTask() {
    try {
        const response = await makeRequest('GET', `/api/tasks/${testTaskId}`, null, {
            'Authorization': `Bearer ${authToken}`
        });
        
        assert.strictEqual(response.status, 200);
        assert.strictEqual(response.data.success, true);
        assert.strictEqual(response.data.data.id, testTaskId);
        assert(Array.isArray(response.data.data.comments));
        assert(Array.isArray(response.data.data.history));
        success('Fetch Single Task');
    } catch (error) {
        fail('Fetch Single Task', error.message);
    }
}

// Comment Tests
async function testAddComment() {
    try {
        const response = await makeRequest('POST', `/api/tasks/${testTaskId}/comments`, {
            content: 'This is a test comment'
        }, {
            'Authorization': `Bearer ${userToken}`
        });
        
        assert.strictEqual(response.status, 200);
        assert.strictEqual(response.data.success, true);
        assert.strictEqual(response.data.data.content, 'This is a test comment');
        assert.strictEqual(response.data.data.is_edited, false);
        success('Add Comment');
    } catch (error) {
        fail('Add Comment', error.message);
    }
}

async function testFetchTaskWithComments() {
    try {
        const response = await makeRequest('GET', `/api/tasks/${testTaskId}`, null, {
            'Authorization': `Bearer ${authToken}`
        });
        
        assert.strictEqual(response.status, 200);
        assert.strictEqual(response.data.success, true);
        assert(response.data.data.comments.length > 0);
        success('Fetch Task with Comments');
    } catch (error) {
        fail('Fetch Task with Comments', error.message);
    }
}

// Dashboard Tests
async function testDashboardStats() {
    try {
        const response = await makeRequest('GET', '/api/dashboard/stats', null, {
            'Authorization': `Bearer ${userToken}`
        });
        
        assert.strictEqual(response.status, 200);
        assert.strictEqual(response.data.success, true);
        assert(response.data.data.user_stats);
        assert(response.data.data.team_stats);
        assert(Array.isArray(response.data.data.recent_activity));
        success('Dashboard Stats');
    } catch (error) {
        fail('Dashboard Stats', error.message);
    }
}

// Security Tests
async function testUnauthorizedAccess() {
    try {
        const response = await makeRequest('GET', '/api/users');
        
        assert.strictEqual(response.status, 401);
        assert.strictEqual(response.data.success, false);
        assert.strictEqual(response.data.error.code, 'UNAUTHORIZED');
        success('Unauthorized Access');
    } catch (error) {
        fail('Unauthorized Access', error.message);
    }
}

async function testForbiddenAccess() {
    try {
        const response = await makeRequest('POST', '/api/users', {
            email: 'test@test.com',
            name: 'Test',
            password: 'pass',
            role: 'USER'
        }, {
            'Authorization': `Bearer ${userToken}` // Regular user trying to create user
        });
        
        assert.strictEqual(response.status, 403);
        assert.strictEqual(response.data.success, false);
        assert.strictEqual(response.data.error.code, 'FORBIDDEN');
        success('Forbidden Access');
    } catch (error) {
        fail('Forbidden Access', error.message);
    }
}

async function testNotFoundEndpoint() {
    try {
        const response = await makeRequest('GET', '/api/nonexistent');
        
        assert.strictEqual(response.status, 404);
        assert.strictEqual(response.data.success, false);
        assert.strictEqual(response.data.error.code, 'NOT_FOUND');
        success('Not Found Endpoint');
    } catch (error) {
        fail('Not Found Endpoint', error.message);
    }
}

// Main test runner
async function runAllTests() {
    console.log('🚀 Starting Issue Tracker API Tests...\n');
    
    try {
        // Wait for server
        await waitForServer();
        
        // Basic tests
        await testHealthCheck();
        await testRootEndpoint();
        
        // Authentication tests
        await testLoginAsAdmin();
        await testLoginWithWrongCredentials();
        await testAuthMe();
        
        // Setup required data (must be done after admin login)
        await testCreateTeamLeadUser();
        await testCreateTeam();
        await testCreateRegularUser();
        
        // Login as created users
        await testLoginAsTeamLead();
        await testLoginAsUser();
        
        // User management tests
        await testFetchUsers();
        await testCreateUser();
        await testCreateDuplicateUser();
        
        // Team management tests
        await testFetchTeams();
        await testFetchTeamMembers();
        
        // Task management tests
        await testFetchTasks();
        await testCreateTask();
        await testUpdateTaskStatus();
        await testInvalidStatusTransition();
        await testFetchSingleTask();
        
        // Comment tests
        await testAddComment();
        await testFetchTaskWithComments();
        
        // Dashboard tests
        await testDashboardStats();
        
        // Security tests
        await testUnauthorizedAccess();
        await testForbiddenAccess();
        await testNotFoundEndpoint();
        
        console.log('\n🎉 All tests completed!');
        if (process.exitCode !== 1) {
            console.log('✅ All tests PASSED!');
        } else {
            console.log('❌ Some tests FAILED!');
        }
        
    } catch (error) {
        console.error('❌ Test suite failed:', error.message);
        process.exitCode = 1;
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    runAllTests();
}

module.exports = { runAllTests }; 