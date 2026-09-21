MAPFORGE — MISE À JOUR PAGE MON COMPTE

Fichiers inclus :
- espace.html : nouvelle page Mon compte, proche de la maquette fournie
- espace.css : design sombre/violet, hero, cartes d'images, responsive

À remplacer dans le dépôt GitHub :
1. espace.html
2. espace.css

La page utilise les images RedWood déjà présentes dans le dépôt :
- redwood-1.jpg
- redwood-3.jpg
- redwood-4.jpg

IMPORTANT :
Le script espace.js actuel du dépôt contient déjà la bonne URL Supabase et la clé publishable.
Le nouveau espace.html ajoute ?v=20260921-3 à espace.js afin de forcer Chrome à charger la dernière version et éviter le cache.

Pour la navigation principale :
ajouter dans index.html, entre À propos et Me contacter :
<a class="account-nav-link" href="espace.html">Mon compte</a>

Après remplacement, fais un commit/push puis Ctrl+F5 sur le site.
