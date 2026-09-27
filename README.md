# Screen Timer - Déploiement Azure

## Mise en place 

L'application tourne sur Azure Container Apps, dans le groupe rg-screentimer-221-2.
L'image Docker est stockée sur l'ACR acrscreentimer2212.azurecr.io.

URL du site : https://ca-screentimer-221-2.whiteisland-f139b6c9.spaincentral.azurecontainerapps.io

## Le pipeline GitLab

Il y a deux jobs dans le fichier .gitlab-ci.yml :

- build_job tourne sur la branche devops-infra. Il installe les dépendances et build le front.
- package_job tourne sur la branche react-prototype. Il construit l'image Docker et la pousse sur l'ACR.

Les variables nécessaires au pipeline (ACR_LOGIN_SERVER, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET) sont déjà configurées dans le projet GitLab, dans Settings puis CI/CD puis Variables. Seuls les membres avec le rôle Maintainer peuvent les voir ou les modifier.

## Comment redéployer l'infrastructure

Se placer dans le dossier infra, puis :

    az login
    terraform init
    terraform plan
    terraform apply

## Comment mettre à jour l'application après un nouveau build

Le pipeline pousse automatiquement une nouvelle image sur l'ACR à chaque push sur react-prototype. Mais Container Apps ne va pas la chercher tout seul, il faut forcer une nouvelle version avec cette commande :

```bash
az containerapp update --name ca-screentimer-221-2 --resource-group rg-screentimer-221-2 --image acrscreentimer2212.azurecr.io/screentimer:latest
```

## Vérifier que tout fonctionne

Aller sur l'URL du site, ou sur l'URL suivie de /healthz. Ça doit afficher "ok".

## Points importants à savoir

L'ACR n'a pas de mot de passe admin activé. L'authentification se fait avec une identité managée créée spécialement pour ça (id-screentimer-acrpull), qui a uniquement le droit de lire les images (AcrPull).

Si un jour il faut recréer complètement le Container App, il vaut mieux le détruire et le recréer d'un coup plutôt que de le modifier petit à petit, sinon l'authentification vers l'ACR peut échouer. La commande pour ça :

```bash
terraform destroy -target=azurerm_container_app.placeholder
terraform apply
```