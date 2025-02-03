# Scrapping Mon Master

## Français

### Description

Ce projet est un web scrapper qui collecte des informations sur les masters en France. Les informations sont collectées à partir du site [monmaster.gouv.fr](https://monmaster.gouv.fr/). Les données sont stockées dans un fichier excel.

### Installation

Pour installer le projet, vous devez avoir node.js installé sur votre ordinateur. Vous pouvez le télécharger [ici](https://nodejs.org/fr/).

Après avoir installé node.js, vous pouvez cloner le projet en exécutant la commande suivante dans votre terminal:

```bash
git clone  https://github.com/maskady/ScrapMonMaster
```

Ensuite, vous devez installer les dépendances en exécutant la commande suivante:

```bash
npm install
```

### Utilisation

Pour exécuter le projet, vous devez exécuter la commande suivante:

```bash
node scrap.js <domaine>
```

Le paramètre domaine est obligatoire. C'est le domaine d'étude que vous voulez scraper. Si votre domaine d'étude est composé de plusieurs mots, vous pouvez l'écrire comme ceci: "domaine d'étude".

La sortie du projet est un fichier excel qui contient les colonnes suivantes:
- Intitulé de la mention
- Intitulé de la formation
- Ville
- Alternance
- Taux d'accès
- Dernier rang appelé
- Nombre de candidatures confirmées
- Lien vers la formation

## English

### Description

This project is a web scrapper that collects information about the master's programs in France. The information is collected from the website [monmaster.gouv.fr](https://monmaster.gouv.fr/). The data is stored in a excel file.

### Installation

To install the project, you need to have node.js installed on your computer. You can download it [here](https://nodejs.org/en/).

After installing node.js, you can clone the project by running the following command in your terminal:

```bash
git clone https://github.com/maskady/ScrapMonMaster
```

Then, you need to install the dependencies by running the following command:

```bash
npm install
```

### Usage

To run the project, you need to run the following command:

```bash
node scrap.js <field>
```

The field parameter is mandatory. It is the field of study that you want to scrap. If your field of study is composed of multiple words, you can write it like this: "field of study".

The output of the project is an excel file that contains the following columns:
- Title of the mention
- Title of the course
- City
- Alternation
- Access rate
- Last called rank
- Number of confirmed applications
- Link to the course