terraform {
  required_version = ">= 1.6.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 5.0"
    }
  }
}

provider "azurerm" {
  features {}
}

locals {
  resource_group_location = "westeurope"
  location                = "spaincentral"

  resource_group_name            = "rg-screentimer-221"
  container_registry_name        = "acrscreentimer221"
  log_analytics_name             = "log-screentimer-221"
  container_app_environment_name = "cae-screentimer-221"
  container_app_name             = "ca-screentimer-221"

  tags = {
    project     = "screentimer"
    class       = "E221"
    environment = "development"
    managed_by  = "terraform"
  }
}

resource "azurerm_resource_group" "main" {
  name     = local.resource_group_name
  location = local.resource_group_location
  tags     = local.tags
}

resource "azurerm_container_registry" "main" {
  name                = local.container_registry_name
  resource_group_name = azurerm_resource_group.main.name
  location            = local.location
  sku                 = "Basic"
  admin_enabled       = false
  tags                = local.tags
}

resource "azurerm_log_analytics_workspace" "main" {
  name                = local.log_analytics_name
  resource_group_name = azurerm_resource_group.main.name
  location            = local.location
  sku                 = "PerGB2018"
  retention_in_days   = 30
  tags                = local.tags
}

resource "azurerm_container_app_environment" "main" {
  name                       = local.container_app_environment_name
  resource_group_name        = azurerm_resource_group.main.name
  location                   = local.location
  logs_destination           = "log-analytics"
  log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id
  tags                       = local.tags
}

resource "azurerm_container_app" "placeholder" {
  name                         = local.container_app_name
  resource_group_name          = azurerm_resource_group.main.name
  container_app_environment_id = azurerm_container_app_environment.main.id
  revision_mode                = "Single"
  tags                         = local.tags

  template {
    min_replicas = 0
    max_replicas = 1

    container {
      name   = "nginx"
      image  = "nginx:alpine"
      cpu    = 0.25
      memory = "0.5Gi"
    }
  }

  ingress {
    external_enabled = true
    target_port      = 80

    traffic_weight {
      latest_revision = true
      percentage      = 100
    }
  }
}

output "resource_group_name" {
  value = azurerm_resource_group.main.name
}

output "acr_login_server" {
  value = azurerm_container_registry.main.login_server
}

output "container_app_url" {
  value = "https://${azurerm_container_app.placeholder.latest_revision_fqdn}"
}