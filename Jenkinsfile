pipeline {
    agent any

    environment {
        DOCKER_IMAGE = 'skilly-backend'
        DOCKER_TAG = "${env.BUILD_ID}"
        SONAR_PROJECT_KEY = 'skilly-backend'
    }

    tools {
        nodejs 'NODE'  // This references your Node installation named "NODE"
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install Dependencies') {
            steps {
                sh 'npm install'
            }
        }

        stage('Test') {
            steps {
                sh 'npm test'
            }
        }

        stage('Build') {
            steps {
                sh 'npm run build'  // Create production build
            }
        }

        stage('Build Docker Image') {
            steps {
                sh "docker build -t ${DOCKER_IMAGE}:${DOCKER_TAG} ."
                sh "docker tag ${DOCKER_IMAGE}:${DOCKER_TAG} ${DOCKER_IMAGE}:latest"
            }
        }

        stage('Deploy to Development') {
            when {
                branch 'develop'
            }
            steps {
                sh 'docker-compose down'
                sh 'docker-compose up -d'  // This will start your application in a container
            }
        }

        stage('Deploy to Production') {
            when {
                branch 'main'
            }
            steps {
                input message: 'Deploy to production?', ok: 'Deploy'
                sh 'docker-compose -f docker-compose.prod.yml down'
                sh 'docker-compose -f docker-compose.prod.yml up -d'
            }
        }
    }

    post {
        always {
            cleanWs()
        }
        success {
            echo 'Build completed successfully!'
        }
        failure {
            echo 'Build failed!'
        }
    }
}
