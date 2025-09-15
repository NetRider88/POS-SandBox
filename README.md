# Talabat POS Integration Testing Platform

🚀 **Enterprise-grade testing environment for Talabat POS integrations**

A comprehensive testing sandbox designed to help restaurants and POS system providers integrate seamlessly with Talabat's order management platform. This tool provides real-time testing, monitoring, and validation capabilities for all aspects of POS integration.

## 🌟 Features

### 🔧 **Integration Configuration**
- Secure credential management
- Multi-environment support (staging/production)
- Country and region-specific configurations
- Configuration import/export functionality

### 🔐 **Authentication Testing**
- OAuth 2.0 flow validation
- Token refresh testing
- Session management
- SSL certificate validation

### 📦 **Order Management Testing**
- Order reception webhook testing
- Order acceptance/rejection flows
- Status update validation
- Auto-accept functionality testing
- Direct and indirect integration support

### 🍽️ **Catalog Management**
- JSON structure validation
- Menu item validation
- Pricing verification
- Image requirement checks
- Centralized kitchen support

### 🏪 **Store Management**
- Availability status testing
- Operating hours validation
- Store visibility controls

### 🔗 **Webhook & API Testing**
- Endpoint accessibility verification
- Payload validation
- IP whitelist testing
- SSL security validation

### 📊 **Real-time Monitoring**
- API response time tracking
- Success rate monitoring
- Error logging and analysis
- System performance metrics

### 📈 **Comprehensive Reporting**
- Order performance reports
- Error analysis reports
- Integration health reports
- Scheduled report generation
- Multiple export formats (JSON, CSV, PDF)

## 🚀 Quick Start

### Prerequisites
- Node.js 14.0.0 or higher
- npm 6.0.0 or higher

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/talabat/pos-integration-platform.git
   cd pos-integration-platform
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup the database**
   ```bash
   npm run setup:db
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Access the platform**
   Open your browser and navigate to `http://localhost:3000`

### Production Setup

1. **Set environment variables**
   ```bash
   export NODE_ENV=production
   export PORT=3000
   ```

2. **Start the production server**
   ```bash
   npm start
   ```

## 📖 Usage Guide

### 1. **Initial Configuration**
- Navigate to the Configuration tab
- Enter your integration details:
  - Integration Name (e.g., "Perfect POS UAE")
  - Integration Code (e.g., "perfect-pos-ae")
  - Base URL (your POS API endpoint)
  - Plugin credentials provided by Talabat
  - Country and region settings

### 2. **Authentication Testing**
- Click "Test Login API" to validate credentials
- Verify token generation and expiry
- Test token refresh functionality

### 3. **Order Management Testing**
- Configure vendor code and remote ID
- Select test scenarios to run
- Execute order flow testing
- Review results and fix any issues

### 4. **Catalog Testing**
- Upload or generate sample catalog JSON
- Validate structure and pricing
- Test image requirements
- Verify availability rules

### 5. **Full Integration Testing**
- Run the complete test suite
- Review comprehensive results
- Address any failing tests
- Generate compliance report

### 6. **Monitoring and Reports**
- Monitor real-time metrics
- Review system logs
- Generate performance reports
- Schedule automated reports

## 🏗️ Architecture

### Frontend
- **Vanilla JavaScript** - Modular architecture with ES6+ features
- **CSS3** - Modern responsive design with CSS Grid and Flexbox
- **Progressive Enhancement** - Works without JavaScript for basic functionality

### Backend
- **Node.js + Express** - RESTful API server
- **SQLite** - Lightweight database for development
- **Security** - Helmet, CORS, rate limiting
- **Monitoring** - Winston logging, performance metrics

### Database Schema
```sql
-- Core tables
configurations     -- Integration configurations
test_results      -- Test execution results
logs             -- System and application logs
api_metrics      -- API performance metrics
reports          -- Generated reports
scheduled_reports -- Automated report scheduling
```

## 🔒 Security Features

- **HTTPS Enforcement** - All API communications require HTTPS
- **Rate Limiting** - Protection against abuse
- **Input Validation** - Comprehensive data validation
- **Password Hashing** - Secure credential storage
- **CORS Configuration** - Proper cross-origin settings
- **Security Headers** - Helmet.js integration

## 🧪 Testing

### Running Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm test -- --coverage
```

### Test Categories
- **Unit Tests** - Individual function testing
- **Integration Tests** - API endpoint testing
- **E2E Tests** - Complete workflow testing

## 📊 API Documentation

### Configuration Endpoints
```
POST   /api/config          # Create configuration
GET    /api/config/:id      # Get configuration
PUT    /api/config/:id      # Update configuration
DELETE /api/config/:id      # Delete configuration
GET    /api/configs         # List configurations
```

### Authentication Endpoints
```
POST   /api/auth/login      # Authenticate user
POST   /api/auth/refresh    # Refresh token
POST   /api/auth/logout     # Logout user
```

### Testing Endpoints
```
POST   /api/test/authentication  # Test auth flow
POST   /api/test/orders         # Test order management
POST   /api/test/catalog        # Test catalog import
POST   /api/test/webhooks       # Test webhook endpoints
POST   /api/test/ssl           # Test SSL certificate
POST   /api/test/full-suite    # Run complete test suite
```

### Monitoring Endpoints
```
GET    /api/monitoring/metrics  # Get performance metrics
GET    /api/monitoring/logs     # Get system logs
POST   /api/monitoring/log      # Add log entry
DELETE /api/monitoring/logs     # Clear logs
```

### Reports Endpoints
```
POST   /api/reports/generate    # Generate report
GET    /api/reports/history     # Get report history
POST   /api/reports/schedule    # Schedule report
GET    /api/reports/scheduled   # Get scheduled reports
```

## 🌍 Regional Configuration

### Supported Regions
- **Middle East + Turkey** - Primary region for Talabat operations
- **Europe** - European expansion markets
- **Asia Pacific** - APAC markets
- **Latin America** - LATAM markets

### IP Whitelisting
Each region has specific IP addresses that need to be whitelisted:

```javascript
// Example IP addresses (staging environment)
const ipAddresses = {
  me: ['63.32.225.161', '18.202.96.85', '52.208.41.152'],
  eu: ['63.32.162.210', '34.255.237.245', '63.32.145.112'],
  // ... additional regions
};
```

## 🚀 Deployment Options

### Docker Deployment
```bash
# Build Docker image
npm run docker:build

# Run Docker container
npm run docker:run
```

### Cloud Deployment
- **AWS** - EC2, ECS, or Lambda deployment
- **Google Cloud** - Compute Engine or Cloud Run
- **Azure** - App Service or Container Instances
- **Heroku** - Direct git deployment

### Environment Variables
```bash
NODE_ENV=production          # Environment mode
PORT=3000                   # Server port
DATABASE_URL=               # Database connection (optional)
JWT_SECRET=                 # JWT signing secret
TALABAT_API_KEY=           # Talabat API key
EMAIL_SERVICE_KEY=         # Email service for reports
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite
6. Submit a pull request

### Code Style
- **ESLint** - Standard JavaScript style
- **Prettier** - Code formatting
- **JSDoc** - Function documentation

## 📝 Changelog

### Version 1.0.0 (Current)
- ✅ Complete integration testing suite
- ✅ Real-time monitoring and metrics
- ✅ Comprehensive reporting system
- ✅ Multi-environment support
- ✅ SSL and security validation
- ✅ Automated test scheduling

### Upcoming Features
- 🔄 Advanced webhook simulation
- 🔄 Load testing capabilities
- 🔄 Custom test scenario builder
- 🔄 Integration with CI/CD pipelines
- 🔄 Mobile app for monitoring

## 🆘 Support

### Documentation
- [Integration Guide](docs/integration-guide.md)
- [API Reference](docs/api-reference.md)
- [Troubleshooting](docs/troubleshooting.md)
- [Best Practices](docs/best-practices.md)

### Getting Help
- **GitHub Issues** - Bug reports and feature requests
- **Email Support** - integration-support@talabat.com
- **Slack Channel** - #pos-integration-support
- **Live Testing** - Schedule sessions with our engineering team

### Common Issues
- **Authentication Failures** - Check credentials and environment
- **SSL Certificate Errors** - Ensure HTTPS endpoints
- **Webhook Timeouts** - Verify endpoint accessibility
- **IP Whitelist Issues** - Confirm regional IP configuration

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Talabat Engineering Team
- POS Integration Partners
- Open Source Community
- Testing and QA Teams

---

**Made with ❤️ by the Talabat Integration Team**

For live testing sessions and production onboarding, please [schedule a session](https://calendly.com/talabat-integration-team) with our engineering team.
