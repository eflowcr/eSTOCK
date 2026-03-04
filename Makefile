# eSTOCK Frontend (Angular) — Makefile
# Run from frontend/ so paths (package.json, angular.json) resolve correctly.

.PHONY: help install start serve build build-prod build-dev watch test lint clean docker-build docker-push all aluap

.DEFAULT_GOAL := help

help: ## Show available commands
	@echo "eSTOCK Frontend (Angular) — usage: make <target>"
	@echo ""
	@echo "  install       Install dependencies (npm install)"
	@echo "  start        Run dev server (ng serve, default port)"
	@echo "  serve        Alias for start"
	@echo "  build        Production build (ng build)"
	@echo "  build-prod   Same as build"
	@echo "  build-dev    Development build (ng build --configuration development)"
	@echo "  watch        Build in watch mode (ng build --watch)"
	@echo "  test         Run unit tests (ng test)"
	@echo "  lint         Run Angular lint (ng lint, if configured)"
	@echo "  clean        Remove dist/ and node_modules/"
	@echo "  docker-build Build Docker image (linux/amd64)"
	@echo "  docker-push  Build and push (all), or aluap variant"
	@echo ""
	@echo "Requires: Node.js, npm; Angular CLI (npx ng or npm run ng)."

install: ## Install dependencies (npm install; use npm ci in CI for reproducible installs)
	npm install

start: ## Run dev server (ng serve)
	npm run start

serve: start ## Alias for start

build: ## Production build
	npm run build

build-prod: build ## Alias for build

build-dev: ## Development build
	npx ng build --configuration development

watch: ## Build in watch mode
	npm run watch

test: ## Run unit tests
	npm run test

lint: ## Run Angular lint (ng lint)
	npm run lint

clean: ## Remove build artifacts and dependencies
	rm -rf dist node_modules .angular

docker-build: ## Build Docker image for linux/amd64 (no push)
	docker buildx build --platform linux/amd64 -t epracsupply/estock_web:local .

docker-push: ## Build and push default image
	docker buildx build --platform linux/amd64 -t epracsupply/estock_web:v1.0.0 . --push

# Legacy targets (keep for compatibility)
all: ## Build and push default image (legacy)
	docker buildx build --platform linux/amd64 -t epracsupply/estock_web:v1.0.0 . --push

aluap: ## Build and push aluap variant (legacy)
	docker buildx build --platform linux/amd64 -t epracsupply/estock_web_aluap:v1.0.0 . --push
