JournalofMachineLearningResearch3(2003)993-1022 Submitted2/02;Published1/03
Latent Dirichlet Allocation
DavidM.Blei BLEI@CS.BERKELEY.EDU
ComputerScienceDivision
UniversityofCalifornia
Berkeley,CA94720,USA
AndrewY.Ng ANG@CS.STANFORD.EDU
ComputerScienceDepartment
StanfordUniversity
Stanford,CA94305,USA
MichaelI.Jordan JORDAN@CS.BERKELEY.EDU
ComputerScienceDivisionandDepartmentofStatistics
UniversityofCalifornia
Berkeley,CA94720,USA
Editor:JohnLafferty
Abstract
WedescribelatentDirichletallocation(LDA),agenerativeprobabilisticmodelforcollectionsof
discretedatasuchastextcorpora. LDAisathree-levelhierarchicalBayesianmodel,inwhicheach
itemofacollectionismodeledasafinitemixtureoveranunderlyingsetoftopics. Eachtopicis,in
turn,modeledasaninfinitemixtureoveranunderlyingsetoftopicprobabilities. Inthecontextof
textmodeling,thetopicprobabilitiesprovideanexplicitrepresentationofadocument. Wepresent
efficientapproximateinferencetechniquesbasedonvariationalmethodsandanEMalgorithmfor
empiricalBayesparameterestimation. Wereportresultsindocumentmodeling,textclassification,
and collaborative filtering, comparing to a mixture of unigrams model and the probabilistic LSI
model.
1. Introduction
In this paper we consider the problem of modeling text corpora and other collections of discrete
data. The goal is to find short descriptions of the members of a collection that enable efficient
processingoflargecollectionswhilepreservingtheessentialstatisticalrelationshipsthatareuseful
forbasictaskssuchasclassification,noveltydetection,summarization,andsimilarityandrelevance
judgments.
Significant progress has been made on this problem by researchers in the field of informa-
tion retrieval (IR) (Baeza-Yates and Ribeiro-Neto, 1999). The basic methodology proposed by
IR researchers for text corpora—a methodology successfully deployed in modern Internet search
engines—reduces each document in the corpus to a vector of real numbers, each of which repre-
sentsratios ofcounts. In thepopular tf-idf scheme (Salton and McGill, 1983), abasicvocabulary
of “words” or “terms” is chosen, and, for each document in the corpus, a count is formed of the
number of occurrences of each word. After suitable normalization, this term frequency count is
comparedtoaninversedocumentfrequencycount,whichmeasuresthenumberofoccurrencesofa
(cid:13)c2003DavidM.Blei,AndrewY.NgandMichaelI.Jordan.

BLEI,NG,ANDJORDAN
wordintheentirecorpus(generallyonalogscale, andagain suitablynormalized). Theend result
isaterm-by-documentmatrixX whosecolumnscontainthetf-idf valuesforeachofthedocuments
inthecorpus. Thusthetf-idf schemereducesdocumentsofarbitrarylengthtofixed-lengthlistsof
numbers.
Whilethetf-idf reductionhassomeappealingfeatures—notablyinitsbasicidentificationofsets
ofwordsthatarediscriminativefordocumentsinthecollection—theapproachalsoprovidesarela-
tivelysmallamountofreductionindescriptionlengthandrevealslittleinthewayofinter-orintra-
documentstatisticalstructure. Toaddresstheseshortcomings,IRresearchershaveproposedseveral
otherdimensionalityreductiontechniques,mostnotablylatentsemanticindexing(LSI)(Deerwester
etal.,1990). LSIusesasingularvaluedecompositionoftheX matrixtoidentifyalinearsubspace
inthespaceoftf-idf featuresthatcapturesmostofthevarianceinthecollection. Thisapproachcan
achieve significant compression in large collections. Furthermore, Deerwester et al. argue that the
derived features of LSI, which are linear combinations of the original tf-idf features, can capture
someaspectsofbasiclinguisticnotionssuchassynonymyandpolysemy.
TosubstantiatetheclaimsregardingLSI,andtostudyitsrelativestrengthsandweaknesses,itis
usefultodevelopagenerativeprobabilisticmodeloftextcorporaandtostudytheabilityofLSIto
recover aspectsof thegenerativemodel from data(Papadimitriou et al., 1998). Given agenerative
modeloftext,however,itisnotclearwhyoneshouldadopttheLSImethodology—onecanattempt
toproceedmoredirectly,fittingthemodeltodatausingmaximumlikelihoodorBayesianmethods.
A significant step forward in this regard was made by Hofmann (1999), who presented the
probabilisticLSI(pLSI)model,alsoknownastheaspectmodel,asanalternativetoLSI.ThepLSI
approach,whichwedescribeindetailinSection4.3,modelseachwordinadocumentasasample
fromamixturemodel,wherethemixturecomponentsaremultinomialrandomvariablesthatcanbe
viewedasrepresentationsof“topics.” Thuseachwordisgeneratedfromasingletopic,anddifferent
words in a document may be generated from different topics. Each document is represented as
a list of mixing proportions for these mixture components and thereby reduced to a probability
distribution on a fixed set of topics. This distribution is the “reduced description” associated with
thedocument.
While Hofmann’s work is a useful step toward probabilistic modeling of text, it is incomplete
in that it provides no probabilistic model at the level of documents. In pLSI, each document is
represented as a list of numbers (the mixing proportions for topics), and there is no generative
probabilistic model for these numbers. This leads to several problems: (1) the number of parame-
ters in the model grows linearly with the size of the corpus, which leads to serious problems with
overfitting,and(2)itisnotclearhowtoassignprobabilitytoadocumentoutsideofthetrainingset.
ToseehowtoproceedbeyondpLSI,letusconsiderthefundamentalprobabilisticassumptions
underlying the class of dimensionality reduction methods that includes LSI and pLSI. All of these
methods are based on the “bag-of-words” assumption—that the order of words in a document can
beneglected. Inthelanguageofprobabilitytheory,thisisanassumptionofexchangeabilityforthe
wordsinadocument(Aldous,1985). Moreover,althoughlessoftenstatedformally,thesemethods
also assume that documents are exchangeable; the specific ordering of the documents in a corpus
canalsobeneglected.
A classic representation theorem due to de Finetti (1990) establishes that any collection of ex-
changeable random variables has a representation as a mixture distribution—in general an infinite
mixture. Thus, if we wish to consider exchangeable representations for documents and words, we
need to consider mixture models that capture the exchangeability of both words and documents.
994

LATENTDIRICHLETALLOCATION
This line of thinking leads to the latent Dirichlet allocation (LDA) model that we present in the
currentpaper.
It is important to emphasize that an assumption of exchangeability is not equivalent to an as-
sumption that the random variables are independent and identically distributed. Rather, exchange-
ability essentially can be interpreted as meaning “conditionally independent and identically dis-
tributed,” where the conditioning is with respect to an underlying latent parameter of a probability
distribution. Conditionally, the joint distribution of the random variables is simple and factored
whilemarginallyoverthelatentparameter,thejointdistributioncanbequitecomplex. Thus,while
an assumption of exchangeability is clearly a major simplifying assumption in the domain of text
modeling,anditsprincipaljustificationisthatitleadstomethodsthatarecomputationallyefficient,
the exchangeability assumptions do not necessarily lead to methods that are restricted to simple
frequency counts or linear operations. We aim to demonstrate in the current paper that, by taking
the de Finetti theorem seriously, we can capture significant intra-document statistical structure via
themixingdistribution.
It is also worth noting that there are a large number of generalizations of the basic notion of
exchangeability, including various forms of partial exchangeability, and that representation theo-
remsareavailableforthesecasesaswell(Diaconis,1988). Thus,whiletheworkthatwediscussin
thecurrentpaperfocusesonsimple“bag-of-words”models,whichleadtomixturedistributionsfor
singlewords(unigrams),ourmethodsarealsoapplicabletorichermodelsthatinvolvemixturesfor
largerstructuralunitssuchasn-gramsorparagraphs.
The paper is organized as follows. In Section 2 we introduce basic notation and terminology.
The LDA model is presented in Section 3 and is compared to related latent variable models in
Section 4. We discuss inference and parameter estimation for LDA in Section 5. An illustrative
example of fitting LDA to data is provided in Section 6. Empirical results in text modeling, text
classification and collaborative filtering are presented in Section 7. Finally, Section 8 presents our
conclusions.
2. Notation andterminology
Weusethelanguageoftextcollectionsthroughoutthepaper, referringtoentitiessuchas“words,”
“documents,” and “corpora.” This is useful in that it helps to guide intuition, particularly when
we introduce latent variables which aim to capture abstract notions such as topics. It is important
to note, however, that the LDA model is not necessarily tied to text, and has applications to other
problemsinvolvingcollectionsofdata,includingdatafromdomainssuchascollaborativefiltering,
content-based image retrieval and bioinformatics. Indeed, in Section 7.3, we present experimental
resultsinthecollaborativefilteringdomain.
Formally,wedefinethefollowingterms:
(cid:15) Aword isthebasicunitofdiscretedata,definedtobeanitemfromavocabularyindexedby
f1,...,Vg. Werepresentwordsusingunit-basisvectorsthathaveasinglecomponentequalto
oneandallothercomponents equaltozero. Thus, usingsuperscriptstodenotecomponents,
thevthwordinthevocabularyisrepresentedbyaV-vectorwsuchthatwv=1andwu=0for
u6=v.
(cid:15) Adocument isasequenceofN wordsdenotedbyw=(w ,w ,...,w ),wherew isthenth
1 2 N n
wordinthesequence.
(cid:15) AcorpusisacollectionofM documentsdenotedbyD =fw ,w ,...,w g.
1 2 M
995

BLEI,NG,ANDJORDAN
We wish to find a probabilistic model of a corpus that not only assigns high probability to
membersofthecorpus,butalsoassignshighprobabilitytoother“similar”documents.
3. LatentDirichletallocation
LatentDirichletallocation(LDA)isagenerativeprobabilisticmodelofacorpus. Thebasicideais
that documents are represented as random mixtures over latent topics, where each topic is charac-
terizedbyadistributionoverwords.1
LDAassumesthefollowinggenerativeprocessforeachdocumentwinacorpusD:
| (cid:24)Poisson(x | ).  |     |     |     |     |
| ----------------- | --- | --- | --- | --- | --- |
1. ChooseN
| Chooseq (cid:24)Dir(a | ).  |     |     |     |     |
| --------------------- | --- | --- | --- | --- | --- |
2.
| 3. ForeachoftheN | wordsw : |     |     |     |     |
| ---------------- | -------- | --- | --- | --- | --- |
n
| (a) Chooseatopicz | (cid:24)Multinomial(q | ).  |     |     |     |
| ----------------- | --------------------- | --- | --- | --- | --- |
n
(b) Chooseawordw from p(w jz ,b ),amultinomialprobabilityconditionedonthetopic
|     | n   | n n |     |     |     |
| --- | --- | --- | --- | --- | --- |
z .
n
Severalsimplifyingassumptionsaremadeinthisbasicmodel,someofwhichweremoveinsubse-
quentsections. First,thedimensionalitykoftheDirichletdistribution(andthusthedimensionality
ofthetopicvariablez)isassumedknownandfixed. Second,thewordprobabilitiesareparameter-
izedbyak(cid:2)V matrixb whereb = p(wj =1jzi =1),whichfornowwetreatasafixedquantity
ij
that is to be estimated. Finally, the Poisson assumption is not critical to anything that follows and
more realistic document length distributions can be used as needed. Furthermore, note that N is
ofalltheotherdatageneratingvariables(q
| independent |     |     | andz). | Itisthusanancillaryvariableand |     |
| ----------- | --- | --- | ------ | ------------------------------ | --- |
wewillgenerallyignoreitsrandomnessinthesubsequentdevelopment.
Ak-dimensionalDirichletrandomvariableq cantakevaluesinthe(k−1)-simplex(ak-vector
q liesinthe(k−1)-simplexifq (cid:21)0,(cid:229) k q =1),andhasthefollowingprobabilitydensityonthis
|     | i   | i=1 i |     |     |     |
| --- | --- | ----- | --- | --- | --- |
simplex:
|     |     | (cid:0) | (cid:1) |     |     |
| --- | --- | ------- | ------- | --- | --- |
|     |     | G k a   |         |     |     |
(cid:229)
|     | p(q | ja )= i=1 | i q a −1(cid:1)(cid:1)(cid:1)q | a k −1, | (1) |
| --- | --- | --------- | ------------------------------ | ------- | --- |
1
|     |     | (cid:213) k G (a | ) 1 | k   |     |
| --- | --- | ---------------- | --- | --- | --- |
|     |     | i=1              | i   |     |     |
wheretheparametera isak-vectorwithcomponentsa >0,andwhereG (x)istheGammafunction.
i
TheDirichletisaconvenientdistributiononthesimplex—itisintheexponentialfamily,hasfinite
dimensionalsufficientstatistics,andisconjugatetothemultinomialdistribution. InSection5,these
propertieswillfacilitatethedevelopmentofinferenceandparameterestimationalgorithmsforLDA.
| Giventheparametersa | andb ,thejointdistributionofatopicmixtureq |     |     |     |     |
| ------------------- | ------------------------------------------ | --- | --- | --- | --- |
,asetofN topicsz,and
asetofN wordswisgivenby:
N
)(cid:213)
|     | p(q ,z,wja | ,b )= p(q ja | p(z jq )p(w | jz ,b ), | (2) |
| --- | ---------- | ------------ | ----------- | -------- | --- |
|     |            |              | n           | n n      |     |
n=1
1.WerefertothelatentmultinomialvariablesintheLDAmodelastopics,soastoexploittext-orientedintuitions,but
wemakenoepistemologicalclaimsregardingtheselatentvariablesbeyondtheirutilityinrepresentingprobability
distributionsonsetsofwords.
996

LATENTDIRICHLETALLOCATION
b
|     | a   | q   | z   |     | w   |     |     |
| --- | --- | --- | --- | --- | --- | --- | --- |
N
M
Figure1: Graphical model representation of LDA. The boxes are “plates” representing replicates.
Theouterplaterepresentsdocuments,whiletheinnerplaterepresentstherepeatedchoice
oftopicsandwordswithinadocument.
where p(z jq )issimplyq fortheuniqueisuchthatzi =1. Integratingoverq andsummingover
| n   | i   |     |     | n   |     |     |     |
| --- | --- | --- | --- | --- | --- | --- | --- |
z,weobtainthemarginaldistributionofadocument:
|     |     |     |     |     |     | !   |     |
| --- | --- | --- | --- | --- | --- | --- | --- |
Z
N
|     | p(wja ,b )= | p(q ja ) | (cid:213) (cid:229) | p(z jq | )p(w | jz ,b ) dq . |     |
| --- | ----------- | -------- | ------------------- | ------ | ---- | ------------ | --- |
(3)
|     |     |     |     | n   |     | n n |     |
| --- | --- | --- | --- | --- | --- | --- | --- |
n=1 zn
Finally, taking the product of the marginal probabilities of single documents, we obtain the proba-
bilityofacorpus:
|     |     |     |     |     |     | !   |     |
| --- | --- | --- | --- | --- | --- | --- | --- |
Z
Nd
|       | (cid:213) M |          | (cid:213) (cid:229) |        |      |         |      |
| ----- | ----------- | -------- | ------------------- | ------ | ---- | ------- | ---- |
| p(Dja | ,b )=       | p(q ja ) |                     | p(z jq | )p(w | jz ,b ) | dq . |
|       |             | d        |                     | dn     | d    | dn dn   | d    |
|       | d=1         |          | n=1zdn              |        |      |         |      |
The LDA model is represented as a probabilistic graphical model in Figure 1. As the figure
makes clear, there are three levels to the LDA representation. The parameters a and b are corpus-
levelparameters,assumedtobesampledonceintheprocessofgeneratingacorpus. Thevariables
q
d aredocument-levelvariables,sampledonceperdocument. Finally,thevariablesz dn andw dn are
word-levelvariablesandaresampledonceforeachwordineachdocument.
It is important to distinguish LDA from a simple Dirichlet-multinomial clustering model. A
classical clustering model would involve a two-level model in which a Dirichlet is sampled once
for a corpus, a multinomial clustering variable is selected once for each document in the corpus,
andasetofwordsareselectedforthedocumentconditionalontheclustervariable. Aswithmany
clusteringmodels,suchamodelrestrictsadocumenttobeingassociatedwithasingletopic. LDA,
ontheotherhand,involvesthreelevels,andnotablythetopicnodeissampledrepeatedlywithinthe
document. Underthismodel,documentscanbeassociatedwithmultipletopics.
Structures similar to that shown in Figure 1 are often studied in Bayesian statistical modeling,
where they are referred to as hierarchical models (Gelman et al., 1995), or more precisely as con-
ditionally independent hierarchical models (Kass and Steffey, 1989). Such models are also often
referred to as parametricempirical Bayes models, a term that refers not only to a particular model
structure, but also to the methods used for estimating parameters in the model (Morris, 1983). In-
deed, as we discuss in Section 5, we adopt the empirical Bayes approach to estimating parameters
suchasa andb insimpleimplementationsofLDA,butwealsoconsiderfullerBayesianapproaches
aswell.
997

BLEI,NG,ANDJORDAN
3.1 LDAandexchangeability
|     |     | fz  | ,...,z g |     |     |     |
| --- | --- | --- | -------- | --- | --- | --- |
A finite set of random variables 1 N is said to be exchangeable if the joint distribution is
| invarianttopermutation. | Ifp | isapermutationoftheintegersfrom1toN: |           |      |         |     |
| ----------------------- | --- | ------------------------------------ | --------- | ---- | ------- | --- |
|                         |     | p(z                                  | ,...,z )= | p(zp | ,...,zp | ).  |
|                         |     |                                      | 1 N       |      | (1)     | (N) |
An infinite sequence of random variables is infinitely exchangeable if every finite subsequence is
exchangeable.
DeFinetti’srepresentationtheoremstatesthatthejointdistributionofaninfinitelyexchangeable
sequence of random variables is as if a random parameter were drawn from some distribution and
thentherandomvariablesinquestionwereindependentandidenticallydistributed,conditionedon
thatparameter.
InLDA,weassumethatwordsaregeneratedbytopics(byfixedconditionaldistributions)and
thatthosetopicsareinfinitelyexchangeablewithinadocument. BydeFinetti’stheorem,theprob-
abilityofasequenceofwordsandtopicsmustthereforehavetheform:
|     |     |     |     |     |     | !   |
| --- | --- | --- | --- | --- | --- | --- |
Z
N
(cid:213)
|     | p(w,z)= |     | p(q ) | p(z | jq )p(w | jz ) dq , |
| --- | ------- | --- | ----- | --- | ------- | --------- |
|     |         |     |       |     | n       | n n       |
n=1
where q is the random parameter of a multinomial over topics. We obtain the LDA distribution
q
on documents in Eq. (3) by marginalizing out the topic variables and endowing with a Dirichlet
distribution.
3.2 Acontinuousmixtureofunigrams
The LDA model shown in Figure 1 is somewhat more elaborate than the two-level models often
studied in the classical hierarchical Bayesian literature. By marginalizing over the hidden topic
variablez,however,wecanunderstandLDAasatwo-levelmodel.
| Inparticular,letusformtheworddistribution |     |     |     | p(wjq | ,b ): |     |
| ----------------------------------------- | --- | --- | --- | ----- | ----- | --- |
)=(cid:229)
|     |     | p(wjq | ,b  | p(wjz,b | )p(zjq | ).  |
| --- | --- | ----- | --- | ------- | ------ | --- |
z
| Notethatthisisarandomquantitysinceitdependsonq |     |     |     |     | .   |     |
| ---------------------------------------------- | --- | --- | --- | --- | --- | --- |
Wenowdefinethefollowinggenerativeprocessforadocumentw:
| Chooseq (cid:24)Dir(a | ).  |     |     |     |     |     |
| --------------------- | --- | --- | --- | --- | --- | --- |
1.
| 2. ForeachoftheN | wordsw | :   |     |     |     |     |
| ---------------- | ------ | --- | --- | --- | --- | --- |
n
| (a) Chooseawordw |     | from | p(w jq ,b | ).  |     |     |
| ---------------- | --- | ---- | --------- | --- | --- | --- |
|                  |     | n    | n         |     |     |     |
Thisprocessdefinesthemarginaldistributionofadocumentasacontinuousmixturedistribution:
|     |     |     |     |     |     | !   |
| --- | --- | --- | --- | --- | --- | --- |
Z
N
|     | p(wja | ,b  | )= p(q | ja ) | (cid:213) p(w | jq ,b ) dq , |
| --- | ----- | --- | ------ | ---- | ------------- | ------------ |
n
n=1
| p(w jq ,b )arethemixturecomponentsand |     |     |     | p(q | ja )arethemixtureweights. |     |
| ------------------------------------- | --- | --- | --- | --- | ------------------------- | --- |
where
n
Figure2illustratesthisinterpretationofLDA.Itdepictsthedistributionon p(wjq ,b )whichis
induced from a particular instance of an LDA model. Note that this distribution on the (V −1)-
simplexisattainedwithonlyk+kV
parametersyetexhibitsaveryinterestingmultimodalstructure.
998

LATENTDIRICHLETALLOCATION
Figure2: An example density on unigram distributions p(wjq ,b ) under LDA for three words and
four topics. The triangle embedded in the x-y plane is the 2-D simplex representing all
possible multinomial distributions over three words. Each of the vertices of the trian-
gle corresponds to a deterministic distribution that assigns probability one to one of the
words;themidpointofanedgegivesprobability0.5totwoofthewords;andthecentroid
of the triangle is the uniform distribution over all three words. The four points marked
with an x are the locations of the multinomial distributions p(wjz) for each of the four
topics, and the surface shown on top of the simplex is an example of a density over the
(V−1)-simplex(multinomialdistributionsofwords)givenbyLDA.
4. Relationshipwithotherlatentvariablemodels
In this section we compare LDA to simpler latent variable models for text—the unigram model, a
mixtureofunigrams,andthepLSImodel. Furthermore,wepresentaunifiedgeometricinterpreta-
tionofthesemodelswhichhighlightstheirkeydifferencesandsimilarities.
4.1 Unigrammodel
Under the unigram model, the words of every document are drawn independently from a single
multinomialdistribution:
N
p(w)= (cid:213) p(w ).
n
n=1
ThisisillustratedinthegraphicalmodelinFigure3a.
999

BLEI,NG,ANDJORDAN
w
N
M
(a)unigram
z w
N
M
(b)mixtureofunigrams
d z w N
M
(c)pLSI/aspectmodel
Figure3: Graphicalmodelrepresentationofdifferentmodelsofdiscretedata.
4.2 Mixtureofunigrams
Ifweaugmenttheunigrammodelwithadiscreterandomtopicvariablez(Figure3b), weobtaina
mixtureofunigramsmodel(Nigametal.,2000). Underthismixturemodel,eachdocumentisgen-
erated by first choosing a topic z and then generating N words independently from the conditional
multinomial p(wjz). Theprobabilityofadocumentis:
N
p(w)=(cid:229) p(z)(cid:213) p(w jz).
n
z n=1
Whenestimatedfromacorpus,theworddistributionscanbeviewedasrepresentationsoftopics
under the assumption that each document exhibits exactly one topic. As the empirical results in
Section 7 illustrate, this assumption is often too limiting to effectively model a large collection of
documents.
In contrast, the LDA model allows documents to exhibit multiple topics to different degrees.
This is achieved at a cost of just one additional parameter: there are k−1 parameters associated
with p(z)inthemixtureofunigrams,versusthekparametersassociatedwith p(q ja )inLDA.
4.3 Probabilisticlatentsemanticindexing
Probabilistic latent semantic indexing (pLSI) is another widely used document model (Hofmann,
1999). The pLSI model, illustrated in Figure 3c, posits that a document label d and a word w are
n
1000

LATENTDIRICHLETALLOCATION
conditionallyindependentgivenanunobservedtopicz:
p(d,w )= p(d)(cid:229) p(w jz)p(zjd).
n n
z
ThepLSImodelattemptstorelaxthesimplifyingassumptionmadeinthemixtureofunigrams
modelthateachdocumentisgeneratedfromonlyonetopic. Inasense,itdoescapturethepossibility
thatadocumentmaycontainmultipletopicssince p(zjd)servesasthemixtureweightsofthetopics
for a particular document d. However, it is important to note that d is a dummy index into the list
of documents in the training set. Thus, d is a multinomial random variable with as many possible
valuesastherearetrainingdocumentsandthemodellearnsthetopicmixtures p(zjd)onlyforthose
documents on which it is trained. For this reason, pLSI is not a well-defined generative model of
documents;thereisnonaturalwaytouseittoassignprobabilitytoapreviouslyunseendocument.
AfurtherdifficultywithpLSI,whichalsostemsfromtheuseofadistributionindexedbytrain-
ing documents, is that the number of parameters which must be estimated grows linearly with the
number of training documents. The parameters for a k-topic pLSI model are k multinomial distri-
butions of size V and M mixtures over the k hidden topics. This gives kV +kM parameters and
therefore linear growth in M. The linear growth in parameters suggests that the model is prone
to overfitting and, empirically, overfitting is indeed a serious problem (see Section 7.1). In prac-
tice, a tempering heuristic is used to smooth the parameters of the model for acceptable predic-
tive performance. It has been shown, however, that overfitting can occur even when tempering is
used(Popesculetal.,2001).
LDAovercomesbothoftheseproblemsbytreatingthetopicmixtureweightsasak-parameter
hiddenrandomvariableratherthanalargesetofindividualparameterswhichareexplicitlylinkedto
thetrainingset. AsdescribedinSection3,LDAisawell-definedgenerativemodelandgeneralizes
easilytonewdocuments. Furthermore,thek+kV parametersinak-topicLDAmodeldonotgrow
with the size of the training corpus. We will see in Section 7.1 that LDA does not suffer from the
sameoverfittingissuesaspLSI.
4.4 Ageometricinterpretation
A good way of illustrating the differences between LDA and the other latent topic models is by
considering the geometry of the latent space, and seeing how a document is represented in that
geometryundereachmodel.
All four of the models described above—unigram, mixture of unigrams, pLSI, and LDA—
operateinthespaceofdistributionsoverwords. Eachsuchdistributioncanbeviewedasapointon
the(V−1)-simplex,whichwecallthewordsimplex.
The unigram model finds a single point on the word simplex and posits that all words in the
corpus come from the corresponding distribution. The latent variable models consider k points on
the word simplex and form a sub-simplex based on those points, which we call the topic simplex.
Note that any point on the topic simplex is also a point on the word simplex. The different latent
variablemodelsusethetopicsimplexindifferentwaystogenerateadocument.
(cid:15) Themixtureofunigramsmodelpositsthatforeachdocument,oneofthekpointsontheword
simplex(thatis,oneofthecornersofthetopicsimplex)ischosenrandomlyandallthewords
ofthedocumentaredrawnfromthedistributioncorrespondingtothatpoint.
1001

BLEI,NG,ANDJORDAN
|     | (cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0) (cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1) (cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0) (cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)o (cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0) (cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)p | (cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0) (cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1) (cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0) (cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)1 (cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0) (cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1) (cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0) (cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1) (cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0) (cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1) (cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0) (cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1) (cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0) (cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1) (cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0) (cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1) (cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0) (cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1) (cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0) (cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1) (cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0) (cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1) (cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0) (cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1) (cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0) (cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1) | (cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0) (cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1) (cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0) (cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1) (cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0) (cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1) (cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0) (cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1) (cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0) (cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1) |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|     | t                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | i c                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
(cid:0)(cid:0)(cid:0) (cid:1)(cid:1)(cid:1) (cid:0)(cid:0)(cid:0) (cid:1)(cid:1)(cid:1)
t o p ic  s im p l e x
x
x x
x
|     | x   |     | w o r d  simplex |
| --- | --- | --- | ---------------- |
x x
x
x x
x
x x
x
x
|     | x x | x   |     |
| --- | --- | --- | --- |
| x   |     | x   |     |
x
|     | x   | x   |     |
| --- | --- | --- | --- |
x
| topic  2 x                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | x                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | x                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |     |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- |
| (cid:0)(cid:0)(cid:1)(cid:1) (cid:0)(cid:0)(cid:1)(cid:1)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | (cid:0)(cid:0)(cid:1)(cid:1)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |     |
| (cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0) (cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1) (cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0) (cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1) (cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0) (cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1) (cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0) (cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1) (cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0) (cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1) (cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0) (cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1) (cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0) (cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1) | (cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0) (cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1) (cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0) (cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1) (cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0) (cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1) (cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0) (cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1) (cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0) (cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1) (cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0) (cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1) (cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0) (cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1) (cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0) (cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0) (cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1) (cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0) | (cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0) (cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0) (cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1) (cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0) (cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0) (cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0) (cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0) (cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0) (cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0) (cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0) (cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1) (cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0) (cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0) (cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0) |     |
|                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | t o p i c                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |   3 |
Figure4: The topic simplex for three topics embedded in the word simplex for three words. The
corners of the word simplex correspond to the three distributions where each word (re-
spectively)hasprobabilityone. Thethreepointsofthetopicsimplexcorrespondtothree
differentdistributionsoverwords. Themixtureofunigramsplaceseachdocumentatone
ofthecornersofthetopicsimplex. ThepLSImodelinducesanempiricaldistributionon
the topic simplex denoted by x. LDA places a smooth distribution on the topic simplex
denotedbythecontourlines.
(cid:15)
ThepLSImodelpositsthateachwordofatrainingdocumentcomesfromarandomlychosen
topic. The topics are themselves drawn from a document-specific distribution over topics,
i.e.,apointonthetopicsimplex. Thereisonesuchdistributionforeachdocument;thesetof
trainingdocumentsthusdefinesanempiricaldistributiononthetopicsimplex.
(cid:15)
LDA posits that each word of both the observed and unseen documents is generated by a
randomlychosentopicwhichisdrawnfromadistributionwitharandomlychosenparameter.
Thisparameterissampledonceperdocumentfromasmoothdistributiononthetopicsimplex.
ThesedifferencesarehighlightedinFigure4.
5. InferenceandParameterEstimation
WehavedescribedthemotivationbehindLDAandillustrateditsconceptualadvantagesoverother
latenttopicmodels. Inthissection,weturnourattentiontoproceduresforinferenceandparameter
estimationunderLDA.
1002

LATENTDIRICHLETALLOCATION
|     |     | b   |     |     |     |     | g   |     | f   |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| a   | q   |     | z   | w   |     |     |     | q   | z   |
N N
M M
Figure5: (Left) Graphical model representation of LDA. (Right) Graphical model representation
ofthevariationaldistributionusedtoapproximatetheposteriorinLDA.
5.1 Inference
The key inferential problem that we need to solve in order to use LDA is that of computing the
posteriordistributionofthehiddenvariablesgivenadocument:
|     |     |     |     |        | p(q   | ,z,wja | ,b ) |     |     |
| --- | --- | --- | --- | ------ | ----- | ------ | ---- | --- | --- |
|     |     |     | p(q | ,zjw,a | ,b )= |        | .    |     |     |
|     |     |     |     |        | p(wja |        | ,b ) |     |     |
Unfortunately,thisdistributionisintractabletocomputeingeneral. Indeed,tonormalizethedistri-
butionwemarginalizeoverthehiddenvariablesandwriteEq.(3)intermsofthemodelparameters:
|     |     |     |     |     |   !  |     |     |     | !   |
| --- | --- | --- | --- | --- | ---- | --- | --- | --- | --- |
Z
|     |       |     | G ((cid:229) | a )    | k              | N         | k V                 |       |      |
| --- | ----- | --- | ------------ | ------ | -------------- | --------- | ------------------- | ----- | ---- |
|     |       |     |              | i      | (cid:213) a −1 | (cid:213) | (cid:229) (cid:213) | j     |      |
|     | p(wja | ,b  | )=           | i      | q i            |           | (q                  | b )wn | dq , |
|     |       |     | (cid:213)    | G (a ) | i              |           |                     | i ij  |      |
|     |       |     |              | i      | i=1            | n=1i=1j=1 |                     |       |      |
i
|     |     |     |     |     |     |     | q b |     |     |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
a function which is intractable due to the coupling between and in the summation over latent
topics(Dickey,1983). Dickeyshowsthatthisfunctionisanexpectationunderaparticularextension
totheDirichletdistributionwhichcanberepresentedwithspecialhypergeometricfunctions. Ithas
beenusedinaBayesiancontextforcensoreddiscretedatatorepresenttheposterioronq
which,in
thatsetting,isarandomparameter(Dickeyetal.,1987).
Althoughtheposteriordistributionisintractableforexactinference,awidevarietyofapproxi-
mateinferencealgorithmscanbeconsideredforLDA,includingLaplaceapproximation,variational
approximation,andMarkovchainMonteCarlo(Jordan,1999). Inthissectionwedescribeasimple
convexity-basedvariationalalgorithmforinferenceinLDA,anddiscusssomeofthealternativesin
Section8.
5.2 Variationalinference
Thebasicideaofconvexity-basedvariationalinferenceistomakeuseofJensen’sinequalitytoob-
tainanadjustablelowerboundontheloglikelihood(Jordanetal.,1999). Essentially,oneconsiders
a family of lower bounds, indexed by a set of variational parameters. The variational parameters
arechosenbyanoptimizationprocedurethatattemptstofindthetightestpossiblelowerbound.
A simple way to obtain a tractable family of lower bounds is to consider simple modifications
of the original graphical model in which some of the edges and nodes are removed. Consider in
q b
particular the LDA model shown in Figure 5 (left). The problematic coupling between and
1003

BLEI,NG,ANDJORDAN
arisesduetotheedgesbetweenq
|     | ,z,andw. | Bydroppingtheseedgesandthewnodes,andendow- |     |     |     |     |     |
| --- | -------- | ------------------------------------------ | --- | --- | --- | --- | --- |
ing the resulting simplified graphical model with free variational parameters, we obtain a family
of distributions on the latent variables. This family is characterized by the following variational
distribution:
N
|     | q(q ,zjg | ,f )=q(q | jg )(cid:213) | q(z | jf ), |     |     |
| --- | -------- | -------- | ------------- | --- | ----- | --- | --- |
(4)
n n
n=1
wheretheDirichletparameterg andthemultinomialparameters(f ,...,f )arethefreevariational
|     |     |     |     |     | 1   | N   |     |
| --- | --- | --- | --- | --- | --- | --- | --- |
parameters.
Having specified a simplified family of probability distributions, the next step is to set up an
optimizationproblemthatdeterminesthevaluesofthevariationalparametersg andf
. Asweshow
in Appendix A, the desideratum of finding a tight lower bound on the log likelihood translates
directlyintothefollowingoptimizationproblem:
| (g (cid:3),f | (cid:3))=argminD(q(q |     | ,zjg ,f | )k p(q | ,zjw,a | ,b )). |     |
| ------------ | -------------------- | --- | ------- | ------ | ------ | ------ | --- |
(5)
(g ,f )
Thus the optimizing values of the variational parameters are found by minimizing the Kullback-
p(q ,zjw,a ,b ).
Leibler (KL) divergence between the variational distribution and the true posterior
This minimization can be achieved via an iterative fixed-point method. In particular, we show in
Appendix A.3 that by computing the derivatives of the KL divergence and setting them equal to
zero,weobtainthefollowingpairofupdateequations:
|     | f (cid:181) | b   | expfE [log(q |     | )jg ]g |     |     |
| --- | ----------- | --- | ------------ | --- | ------ | --- | --- |
(6)
|     | ni  | iwn          | q      | i   |     |     |     |
| --- | --- | ------------ | ------ | --- | --- | --- | --- |
|     | g = | a +(cid:229) | N f    | .   |     |     | (7) |
|     | i   | i            | n=1 ni |     |     |     |     |
AsweshowinAppendixA.1,theexpectationinthemultinomialupdatecanbecomputedasfollows:
|     |          |         |        | (cid:0)     | (cid:1) |     |     |
| --- | -------- | ------- | ------ | ----------- | ------- | --- | --- |
|     | E [log(q | )jg ]=Y | (g )−Y | (cid:229) k | g       | ,   | (8) |
|     | q        | i       | i      |             | j=1 j   |     |     |
where Y is the first derivative of the logG function which is computable via Taylor approxima-
tions(AbramowitzandStegun,1970).
Eqs. (6) and (7) have an appealing intuitive interpretation. The Dirichlet update is a poste-
rior Dirichlet given expected observations taken under the variational distribution, E[z jf ]. The
n n
multinomial update is akin to using Bayes’ theorem, p(z jw ) (cid:181) p(w jz )p(z ), where p(z ) is
|     |     |     |     | n   | n   | n n n | n   |
| --- | --- | --- | --- | --- | --- | ----- | --- |
approximatedbytheexponentialoftheexpectedvalueofitslogarithmunderthevariationaldistri-
bution.
It is important to note that the variational distribution is actually a conditional distribution,
varying as a function of w. This occurs because the optimization problem in Eq. (5) is conducted
|     |     |     | (g (cid:3),f | (cid:3)) |     |     |     |
| --- | --- | --- | ------------ | -------- | --- | --- | --- |
for fixed w, and thus yields optimizing parameters that are a function of w. We can write
the resulting variational distribution as q(q ,zjg (cid:3)(w),f (cid:3)(w)), where we have made the dependence
onwexplicit. Thusthevariationaldistributioncanbeviewedasanapproximationtotheposterior
p(q ,zjw,a ,b ).
distribution
In the language of text, the optimizing parameters (g (cid:3)(w),f (cid:3)(w)) are document-specific. In
(cid:3)(w)
particular, we view the Dirichlet parameters g as providing a representation of a document in
thetopicsimplex.
1004

LATENTDIRICHLETALLOCATION
| (1) | initializef 0 :=1/kforalliandn |     |     |     |
| --- | ------------------------------ | --- | --- | --- |
ni
|     | initializeg :=a | +N/kforalli |     |     |
| --- | --------------- | ----------- | --- | --- |
(2)
i i
| (3) | repeat    |     |     |     |
| --- | --------- | --- | --- | --- |
| (4) | forn=1toN |     |     |     |
fori=1tok
(5)
|     | f t+1:=b   | exp(Y         | (g t)) |     |
| --- | ---------- | ------------- | ------ | --- |
| (6) |            | iwn           |        |     |
|     | ni         |               | i      |     |
| (7) | normalizef | t+1 tosumto1. |        |     |
n
|     | t+1:=a       | t+1 |     |     |
| --- | ------------ | --- | --- | --- |
| (8) | g +(cid:229) | N f |     |     |
n=1 n
| (9) | untilconvergence |                                       |     |     |
| --- | ---------------- | ------------------------------------- | --- | --- |
|     | Figure6:         | AvariationalinferencealgorithmforLDA. |     |     |
WesummarizethevariationalinferenceprocedureinFigure6, withappropriatestartingpoints
| g f |     |     |     |     |
| --- | --- | --- | --- | --- |
for and . From the pseudocode it is clear that each iteration of variational inference for LDA
n
requires O((N+1)k) operations. Empirically, we find that the number of iterations required for a
singledocumentisontheorderofthenumberofwordsinthedocument. Thisyieldsatotalnumber
ofoperationsroughlyontheorderofN2k.
5.3 Parameterestimation
In this section we present an empirical Bayes method for parameter estimation in the LDA model
(see Section 5.4 for a fuller Bayesian approach). In particular, given a corpus of documents D =
| fw ,w ,...,w | g,wewishtofindparametersa |     | andb |     |
| ------------ | ------------------------- | --- | ---- | --- |
thatmaximizethe(marginal)loglikelihood
| 1 2 | M   |     |     |     |
| --- | --- | --- | --- | --- |
ofthedata:
M
(cid:229)
|     |     | (cid:96)(a ,b )= | logp(w | ja ,b ). |
| --- | --- | ---------------- | ------ | -------- |
d
d=1
As we have described above, the quantity p(wja ,b ) cannot be computed tractably. However,
variationalinferenceprovidesuswithatractablelowerboundontheloglikelihood,aboundwhich
wecanmaximizewithrespecttoa andb . WecanthusfindapproximateempiricalBayesestimates
fortheLDAmodelviaanalternatingvariationalEM procedurethatmaximizesalowerboundwith
| respecttothevariationalparametersg |     | andf |     |     |
| ---------------------------------- | --- | ---- | --- | --- |
,andthen,forfixedvaluesofthevariationalparameters,
| maximizesthelowerboundwithrespecttothemodelparametersa |     |     |     | andb |
| ------------------------------------------------------ | --- | --- | --- | ---- |
.
We provide a detailed derivation of the variational EM algorithm for LDA in Appendix A.4.
Thederivationyieldsthefollowingiterativealgorithm:
(cid:3),f (cid:3)
1. (E-step)Foreachdocument,findtheoptimizingvaluesofthevariationalparametersfg :
d d
d2Dg.
Thisisdoneasdescribedintheprevioussection.
2. (M-step)Maximizetheresultinglowerboundontheloglikelihoodwithrespecttothemodel
parametersa andb . Thiscorrespondstofindingmaximumlikelihoodestimateswithexpected
sufficientstatisticsforeachdocumentundertheapproximateposteriorwhichiscomputedin
theE-step.
1005

BLEI,NG,ANDJORDAN
h b
k
a q z w
N
M
Figure7: GraphicalmodelrepresentationofthesmoothedLDAmodel.
Thesetwostepsarerepeateduntilthelowerboundontheloglikelihoodconverges.
InAppendixA.4,weshowthattheM-stepupdatefortheconditionalmultinomialparameterb
canbewrittenoutanalytically:
b (cid:181) (cid:229)
M
(cid:229)
Nd
f (cid:3) w j . (9)
ij dni dn
d=1n=1
We further show that the M-step update for Dirichlet parameter a can be implemented using an
efficientNewton-RaphsonmethodinwhichtheHessianisinvertedinlineartime.
5.4 Smoothing
Thelargevocabularysizethatischaracteristicofmanydocumentcorporacreatesseriousproblems
of sparsity. A new document is very likely to contain words that did not appear in any of the
documents in a training corpus. Maximum likelihood estimates of the multinomial parameters
assign zero probability to such words, and thus zero probability to new documents. The standard
approachtocopingwiththisproblemisto“smooth”themultinomialparameters,assigningpositive
probability to all vocabulary items whether or not they are observed in the training set (Jelinek,
1997). Laplace smoothing is commonly used; this essentially yields the mean of the posterior
distributionunderauniformDirichletprioronthemultinomialparameters.
Unfortunately,inthemixturemodelsetting,simpleLaplacesmoothingisnolongerjustifiedasa
maximumaposteriorimethod(althoughitisoftenimplementedinpractice;cf.Nigametal.,1999).
Infact,byplacingaDirichletprioronthemultinomialparameterweobtainanintractableposterior
in the mixture model setting, for much the same reason that one obtains an intractable posterior in
thebasicLDAmodel. Ourproposedsolutiontothisproblemistosimplyapplyvariationalinference
methodstotheextendedmodelthatincludesDirichletsmoothingonthemultinomialparameter.
In the LDA setting, we obtain the extended graphical model shown in Figure 7. We treat b as
a k(cid:2)V random matrix (one row for each mixture component), where we assume that each row
is independently drawn from an exchangeable Dirichlet distribution.2 We now extend our infer-
ence procedures to treat the b as random variables that are endowed with a posterior distribution,
i
2.AnexchangeableDirichletissimplyaDirichletdistributionwithasinglescalarparameterh .Thedensityisthesame
asaDirichlet(Eq.1)wherea i =h foreachcomponent.
1006

LATENTDIRICHLETALLOCATION
conditioned on the data. Thus we move beyond the empirical Bayes procedure of Section 5.3 and
considerafullerBayesianapproachtoLDA.
WeconsideravariationalapproachtoBayesianinferencethatplacesaseparabledistributionon
therandomvariablesb ,q ,andz(Attias,2000):
k M
q(b ,z ,q jl ,f ,g )=(cid:213) Dir(b jl )(cid:213) q (q ,z jf ,g ),
1:k 1:M 1:M i i d d d d d
i=1 d=1
where q (q ,zjf ,g ) is the variational distribution defined for LDA in Eq. (4). As is easily verified,
d
the resulting variational inference procedure again yields Eqs. (6) and (7) as the update equations
for the variational parameters f and g , respectively, as well as an additional update for the new
variationalparameterl :
l =h + (cid:229)
M
(cid:229)
Nd
f (cid:3) w j .
ij dni dn
d=1n=1
Iteratingtheseequationstoconvergenceyieldsanapproximateposteriordistributiononb ,q ,andz.
We are now left with the hyperparameter h on the exchangeable Dirichlet, as well as the hy-
perparametera frombefore. Ourapproachtosettingthesehyperparametersisagain(approximate)
empiricalBayes—weusevariationalEMtofindmaximumlikelihoodestimatesoftheseparameters
basedonthemarginallikelihood. TheseproceduresaredescribedinAppendixA.4.
6. Example
In this section, we provide an illustrative example of the use of an LDA model on real data. Our
dataare16,000documentsfromasubsetoftheTRECAPcorpus(Harman,1992). Afterremoving
astandardlistofstopwords,weusedtheEMalgorithmdescribedinSection5.3tofindtheDirichlet
and conditional multinomial parameters for a 100-topic LDA model. The top words from some of
the resultingmultinomial distributions p(wjz)areillustrated in Figure8 (top). Aswe have hoped,
thesedistributionsseemtocapturesomeoftheunderlyingtopicsinthecorpus(andwehavenamed
themaccordingtothesetopics).
AsweemphasizedinSection4,oneoftheadvantagesofLDAoverrelatedlatentvariablemod-
els is that it provides well-defined inference procedures for previously unseen documents. Indeed,
wecanillustratehowLDAworksbyperforminginferenceonaheld-outdocumentandexamining
theresultingvariationalposteriorparameters.
Figure 8 (bottom) is a document from the TREC AP corpus which was not used for parameter
estimation. Using the algorithm in Section 5.1, we computed the variational posterior Dirichlet
parametersg forthearticleandvariationalposteriormultinomialparametersf foreachwordinthe
n
article.
Recall that the ith posterior Dirichlet parameter g is approximately the ith prior Dirichlet pa-
i
rameter a plus the expected number of words which were generated by the ith topic (see Eq. 7).
i
Therefore,thepriorDirichletparameterssubtractedfromtheposteriorDirichletparametersindicate
the expected number of words which were allocated to each topic for a particular document. For
the example article in Figure 8 (bottom), most of the g are close to a . Four topics, however, are
i i
significantlylarger(bythis,wemeang −a (cid:21)1). Lookingatthecorrespondingdistributionsover
i i
wordsidentifiesthetopicswhichmixedtoformthisdocument(Figure8,top).
1007

BLEI,NG,ANDJORDAN
Further insight comes from examining the f parameters. These distributions approximate
n
p(z jw)andtendtopeaktowardsoneofthek possibletopicvalues. InthearticletextinFigure8,
n
thewordsarecolorcodedaccordingtothesevalues(i.e., theithcolorisusedifq (zi =1)>0.9).
n n
Withthisillustration,onecanidentifyhowthedifferenttopicsmixedinthedocumenttext.
While demonstrating the power of LDA, the posterior analysis also highlights some of its lim-
itations. In particular, the bag-of-words assumption allows words that should be generated by the
same topic (e.g., “William Randolph Hearst Foundation”) to be allocated to several different top-
ics. Overcoming this limitation would require some form of extension of the basic LDA model;
in particular, we might relax the bag-of-words assumption by assuming partial exchangeability or
Markovianityofwordsequences.
7. ApplicationsandEmpiricalResults
Inthissection,wediscussourempiricalevaluationofLDAinseveralproblemdomains—document
modeling,documentclassification,andcollaborativefiltering.
In all of the mixture models, the expected complete log likelihood of the data has local max-
ima at the points where all or some of the mixture components are equal to each other. To avoid
theselocalmaxima,itisimportanttoinitializetheEMalgorithmappropriately. Inourexperiments,
weinitializeEMbyseedingeachconditionalmultinomialdistributionwithfivedocuments,reduc-
ing their effective total length to two words, and smoothing across the whole vocabulary. This is
essentiallyanapproximationtotheschemedescribedinHeckermanandMeila(2001).
7.1 Documentmodeling
Wetrainedanumberoflatentvariablemodels,includingLDA,ontwotextcorporatocomparethe
generalizationperformanceofthesemodels. Thedocumentsinthecorporaaretreatedasunlabeled;
thus, our goal is density estimation—we wish to achieve high likelihood on a held-out test set. In
particular,wecomputedtheperplexityofaheld-outtestsettoevaluatethemodels. Theperplexity,
usedbyconventioninlanguagemodeling,ismonotonicallydecreasinginthelikelihoodofthetest
data, and is algebraicly equivalent to the inverse of the geometric mean per-word likelihood. A
lowerperplexityscoreindicatesbettergeneralizationperformance.3 Moreformally,foratestsetof
M documents,theperplexityis:
(cid:26) (cid:27)
(cid:229) M logp(w )
perplexity(D )=exp − d=1 d .
test (cid:229) M N
d=1 d
Inourexperiments,weusedacorpusofscientificabstractsfromtheC.Eleganscommunity(Av-
ery,2002)containing5,225abstractswith28,414uniqueterms,andasubsetoftheTRECAPcorpus
containing 16,333 newswire articles with 23,075 unique terms. In both cases, we held out 10% of
thedatafortestpurposesandtrainedthemodelsontheremaining90%. Inpreprocessingthedata,
3.Notethatwesimplyuseperplexityasafigureofmeritforcomparingmodels. Themodelsthatwecompareareall
unigram(“bag-of-words”)models,which—aswehavediscussedintheIntroduction—areofinterestintheinforma-
tionretrievalcontext.Wearenotattemptingtodolanguagemodelinginthispaper—anenterprisethatwouldrequire
ustoexaminetrigramorotherhigher-ordermodels. Wenoteinpassing,however,thatextensionsofLDAcouldbe
consideredthatinvolveDirichlet-multinomialovertrigramsinsteadofunigrams. Weleavetheexplorationofsuch
extensionstolanguagemodelingtofuturework.
1008

LATENTDIRICHLETALLOCATION
| \ A r t s "   | \ B u d     | g e t s " | \ C h i l d r e n | " \ E d u | c a t i o n " |
| ------------- | ----------- | --------- | ----------------- | --------- | ------------- |
| N E W         | M I L L I O | N         | C H I L D R E N   | S C H O O | L             |
| F I L M       | T A X       |           | W O M E N         | S T U D E | N T S         |
| S H O W       | P R O G R   | A M       | P E O P L E       | S C H O O | L S           |
| M U S I C     | B U D G E   | T         | C H I L D         | E D U C A | T I O N       |
| M O V I E     | B I L L I O | N         | Y E A R S         | T E A C H | E R S         |
| P L A Y       | F E D E R   | A L       | F A M I L I E S   | H I G H   |               |
| M U S I C A L | Y E A R     |           | W O R K           | P U B L I | C             |
| B E S T       | S P E N D   | I N G     | P A R E N T S     | T E A C H | E R           |
| A C T O R     | N E W       |           | S A Y S           | B E N N E | T T           |
| F I R S T     | S T A T E   |           | F A M I L Y       | M A N I G | A T           |
| Y O R K       | P L A N     |           | W E L F A R E     | N A M P   | H Y           |
| O P E R A     | M O N E     | Y         | M E N             | S T A T E |               |
| T H E A T E   | R P R O G R | A M S     | P E R C E N T     | P R E S I | D E N T       |
| A C T R E S S | G O V E R   | N M E N T | C A R E           | E L E M E | N T A R Y     |
| L O V E       | C O N G     | R E S S   | L I F E           | H A I T I |               |
TheWilliam Randolph Hearst Foundation willgive$1.25 million toLincoln Center, Metropoli-
tan Opera Co., New York Philharmonic and Juilliard School. “Our board felt that we had a
real opportunity to make a mark on the future of the performing arts with these grants an act
everybit asimportant asourtraditional areas ofsupport inhealth, medical research, education
and the social services,” Hearst Foundation President Randolph A. Hearst said Monday in
announcing the grants. Lincoln Center’s share will be $200,000 for its new building, which
will house young artists and provide new public facilities. The Metropolitan Opera Co. and
New York Philharmonic will receive $400,000 each. The Juilliard School, where music and
the performing arts are taught, will get $250,000. The Hearst Foundation, a leading supporter
of the Lincoln Center Consolidated Corporate Fund, will make its usual annual $100,000
donation, too.
Figure8: An example article from the AP corpus. Each color codes a different factor from which
thewordisputativelygenerated.
1009

BLEI,NG,ANDJORDAN
3400
3200
3000
2800
2600
2400
2200
2000
1800
1600
1400
0 10 20 30 40 50 60 70 80 90 100
Number of Topics
ytixelpreP
Smoothed Unigram
Smoothed Mixt. Unigrams
LDA
Fold in pLSI
7000
6500
6000
5500
5000
4500
4000
3500
3000
2500
0 20 40 60 80 100 120 140 160 180 200
Number of Topics
ytixelpreP
Smoothed Unigram
Smoothed Mixt. Unigrams
LDA
Fold in pLSI
Figure9: Perplexityresultsonthenematode(Top)andAP(Bottom)corporaforLDA,theunigram
model,mixtureofunigrams,andpLSI.
1010

LATENTDIRICHLETALLOCATION
| Num. topics(k) | Perplexity(Mult. | Mixt.) Perplexity(pLSI) |
| -------------- | ---------------- | ----------------------- |
| 2              | 22,266           | 7,052                   |
| 5              | 2.20(cid:2)108   | 17,588                  |
| 10             | 1.93(cid:2)1017  | 63,800                  |
|                | 1.20(cid:2)1022  | 2.52(cid:2)105          |
20
| 50  | 4.19(cid:2)10106 | 5.04(cid:2)106 |
| --- | ---------------- | -------------- |
| 100 | 2.39(cid:2)10150 | 1.72(cid:2)107 |
|     | 3.51(cid:2)10264 | 1.31(cid:2)107 |
200
Table1: OverfittinginthemixtureofunigramsandpLSImodelsfortheAPcorpus. Similarbehav-
iorisobservedinthenematodecorpus(notreported).
we removed a standard list of 50 stop words from each corpus. From the AP data, we further
removedwordsthatoccurredonlyonce.
WecomparedLDAwiththeunigram,mixtureofunigrams,andpLSImodelsdescribedinSec-
tion4. WetrainedallthehiddenvariablemodelsusingEMwithexactlythesamestoppingcriteria,
thattheaveragechangeinexpectedloglikelihoodislessthan0.001%.
BoththepLSImodelandthemixtureofunigramssufferfromseriousoverfittingissues,though
fordifferentreasons. ThisphenomenonisillustratedinTable1. Inthemixtureofunigramsmodel,
overfitting is a result of peaked posteriors in the training set; a phenomenon familiar in the super-
visedsetting,wherethismodelisknownasthenaiveBayesmodel(Rennie,2001). Thisleadstoa
nearlydeterministicclusteringofthetrainingdocuments(intheE-step)whichisusedtodetermine
the word probabilities in each mixture component (in the M-step). A previously unseen document
may best fit one of the resulting mixture components, but will probably contain at least one word
which did not occur in the training documents that were assigned to that component. Such words
will have a very small probability, which causes the perplexity of the new document to explode.
As k increases, the documents of the training corpus are partitioned into finer collections and thus
inducemorewordswithsmallprobabilities.
Inthemixtureofunigrams,wecanalleviateoverfittingthroughthevariationalBayesiansmooth-
ing scheme presented in Section 5.4. This ensures that all words will have some probability under
everymixturecomponent.
In the pLSI case, the hard clustering problem is alleviated by the fact that each document is
allowed to exhibit a different proportion of topics. However, pLSI only refers to the training doc-
p(zjd)
uments and a different overfitting problem arises that is due to the dimensionality of the
parameter. Onereasonableapproachtoassigningprobabilitytoapreviouslyunseendocumentisby
marginalizingoverd:
N
| p(w)=(cid:229) | (cid:213) (cid:229) p(w | jz)p(zjd)p(d). |
| -------------- | ----------------------- | -------------- |
n
|     | n=1 z |     |
| --- | ----- | --- |
d
Essentially,weareintegratingovertheempiricaldistributiononthetopicsimplex(seeFigure4).
Thismethodofinference,thoughtheoreticallysound,causesthemodeltooverfit. Thedocument-
specifictopicdistributionhassomecomponentswhichareclosetozeroforthosetopicsthatdonot
appear in the document. Thus, certain words will have very small probability in the estimates of
1011

BLEI,NG,ANDJORDAN
eachmixturecomponent. Whendeterminingtheprobabilityofanewdocumentthroughmarginal-
ization, only those training documents which exhibit a similar proportion of topics will contribute
to the likelihood. For a given training document’s topic proportions, any word which has small
probability in all the constituent topics will cause the perplexity to explode. As k gets larger, the
chance that a training document will exhibit topics that cover all the words in the new document
decreasesandthustheperplexitygrows. NotethatpLSIdoesnotoverfitasquickly(withrespectto
k)asthemixtureofunigrams.
Thisoverfittingproblemessentiallystemsfromtherestrictionthateachfuturedocumentexhibit
the same topic proportions as were seen in one or more of the training documents. Given this
constraint,wearenotfreetochoosethemostlikelyproportionsoftopicsforthenewdocument. An
alternativeapproachisthe“folding-in”heuristicsuggestedbyHofmann(1999),whereoneignores
the p(zjd)parametersandrefits p(zjd ). NotethatthisgivesthepLSImodelanunfairadvantage
new
byallowingittorefitk−1parameterstothetestdata.
LDAsuffersfromneitheroftheseproblems. AsinpLSI,eachdocumentcanexhibitadifferent
proportion of underlying topics. However, LDA can easily assign probability to a new document;
noheuristicsareneededforanewdocumenttobeendowedwithadifferentsetoftopicproportions
thanwereassociatedwithdocumentsinthetrainingcorpus.
Figure 9 presents the perplexity for each model on both corpora for different values of k. The
pLSI model and mixture of unigrams are suitably corrected for overfitting. The latent variable
models perform better than the simple unigram model. LDA consistently performs better than the
othermodels.
7.2 Documentclassification
In the text classification problem, we wish to classify a document into two or more mutually ex-
clusive classes. As in any classification problem, we may wish to consider generative approaches
or discriminative approaches. In particular, by using one LDA module for each class, we obtain a
generativemodelforclassification. ItisalsoofinteresttouseLDAinthediscriminativeframework,
andthisisourfocusinthissection.
Achallengingaspectofthedocumentclassificationproblemisthechoiceoffeatures. Treating
individual words as features yields a rich but very large feature set (Joachims, 1999). One way to
reduce this feature set is to use an LDA model for dimensionality reduction. In particular, LDA
reduces any document to a fixed set of real-valued features—the posterior Dirichlet parameters
g (cid:3)(w) associated with the document. It is of interest to see how much discriminatory information
weloseinreducingthedocumentdescriptiontotheseparameters.
We conducted two binary classification experiments using the Reuters-21578 dataset. The
datasetcontains8000documentsand15,818words.
In these experiments, we estimated the parameters of an LDA model on all the documents,
withoutreferencetotheirtrueclasslabel. Wethentrainedasupportvectormachine(SVM)onthe
low-dimensional representations provided by LDA and compared this SVM to an SVM trained on
allthewordfeatures.
UsingtheSVMLightsoftwarepackage(Joachims,1999),wecomparedanSVMtrainedonall
the word features with those trained on features induced by a 50-topic LDA model. Note that we
reducethefeaturespaceby99.6percentinthiscase.
1012

LATENTDIRICHLETALLOCATION
| 95  |     |     | 98  |     |     |
| --- | --- | --- | --- | --- | --- |
97
| ycaruccA |     | ycaruccA | 96  |     |     |
| -------- | --- | -------- | --- | --- | --- |
90
95
|     | LDA Features |     | 94  |     |     |
| --- | ------------ | --- | --- | --- | --- |
LDA Features
Word Features
Word Features
| 85     |          |          | 93     |          |          |
| ------ | -------- | -------- | ------ | -------- | -------- |
| 0 0.05 | 0.1 0.15 | 0.2 0.25 | 0 0.05 | 0.1 0.15 | 0.2 0.25 |
Proportion of data used for training
Proportion of data used for training
|     | (a) |     |     | (b) |     |
| --- | --- | --- | --- | --- | --- |
Figure10: Classification results on two binary classification problems from the Reuters-21578
dataset for different proportions of training data. Graph (a) is EARN vs. NOT EARN.
| Graph(b)is | GRAINvs. | GRAIN. |     |     |     |
| ---------- | -------- | ------ | --- | --- | --- |
NOT
600
LDA
|     | 550 | Fold in pLSI |     |     |     |
| --- | --- | ------------ | --- | --- | --- |
Smoothed Mixt. Unigrams
500
ytixelpreP evitciderP
450
400
350
300
250
200
|     | 0   | 10 20 | 30 40 | 50  |     |
| --- | --- | ----- | ----- | --- | --- |
Number of Topics
Figure11: ResultsforcollaborativefilteringontheEachMoviedata.
Figure 10 shows our results. We see that there is little reduction in classification performance
in usingtheLDA-basedfeatures; indeed, in almost allcases theperformanceisimproved with the
LDAfeatures. Althoughtheseresultsneedfurthersubstantiation,theysuggestthatthetopic-based
representation provided by LDA may be useful as a fast filtering algorithm for feature selection in
textclassification.
1013

BLEI,NG,ANDJORDAN
7.3 Collaborativefiltering
Our final experiment uses the EachMovie collaborative filtering data. In this data set, a collection
of users indicates their preferred movie choices. A user and the movies chosen are analogous to a
documentandthewordsinthedocument(respectively).
Thecollaborativefilteringtaskisasfollows. Wetrainamodelonafullyobservedsetofusers.
Then, foreachunobserveduser, weareshownallbutoneofthemoviespreferredbythatuserand
areaskedtopredictwhattheheld-outmovieis. Thedifferentalgorithmsareevaluatedaccordingto
thelikelihoodtheyassigntotheheld-outmovie. Moreprecisely,definethepredictiveperplexityon
M testuserstobe:
(cid:26) (cid:27)
predictive-perplexity(D )=exp −
(cid:229) M
d=1
logp(w
d,Nd
jw
d,1:Nd −1
)
) .
test
M
WerestrictedtheEachMoviedatasettousersthatpositivelyratedatleast100movies(apositive
ratingisatleastfouroutoffivestars). Wedividedthissetofusersinto3300trainingusersand390
testingusers.
Underthemixtureofunigramsmodel,theprobabilityofamoviegivenasetofobservedmovies
isobtainedfromtheposteriordistributionovertopics:
p(wjw )=(cid:229) p(wjz)p(zjw ).
obs obs
z
In the pLSI model, the probability of a held-out movie is given by the same equation except that
p(zjw ) is computed by folding in the previously seen movies. Finally, in the LDA model, the
obs
probabilityofaheld-outmovieisgivenbyintegratingovertheposteriorDirichlet:
Z
p(wjw )= (cid:229) p(wjz)p(zjq )p(q jw )dq ,
obs obs
z
where p(q jw ) is given by the variational inference method described in Section 5.2. Note that
obs
thisquantityisefficienttocompute. Wecaninterchangethesumandintegralsign, andcomputea
linearcombinationofkDirichletexpectations.
With a vocabulary of 1600 movies, we find the predictive perplexities illustrated in Figure 11.
Again,themixtureofunigramsmodelandpLSIarecorrectedforoverfitting,butthebestpredictive
perplexitiesareobtainedbytheLDAmodel.
8. Discussion
We have described latent Dirichlet allocation, a flexible generative probabilistic model for collec-
tions of discrete data. LDA is based on a simple exchangeability assumption for the words and
topics in a document; it is therefore realized by a straightforward application of de Finetti’s repre-
sentationtheorem. WecanviewLDAasadimensionalityreductiontechnique,inthespiritofLSI,
but with proper underlying generative probabilistic semantics that make sense for the type of data
thatitmodels.
Exact inference is intractable for LDA, but any of a large suite of approximate inference algo-
rithms can be used for inference and parameter estimation within the LDA framework. We have
presentedasimpleconvexity-basedvariationalapproachforinference,showingthatityieldsafast
1014

LATENTDIRICHLETALLOCATION
algorithm resulting in reasonable comparative performance in terms of test set likelihood. Other
approachesthatmightbeconsideredincludeLaplaceapproximation,higher-ordervariationaltech-
niques, and Monte Carlo methods. In particular, Leisink and Kappen (2002) have presented a
general methodology for converting low-order variational lower bounds into higher-order varia-
tionalbounds. Itisalsopossibletoachievehigheraccuracybydispensingwiththerequirementof
maintaining a bound, and indeed Minka and Lafferty (2002) have shown that improved inferential
accuracycanbeobtainedfortheLDAmodelviaahigher-ordervariationaltechniqueknownasex-
pectationpropagation. Finally,GriffithsandSteyvers(2002)havepresentedaMarkovchainMonte
CarloalgorithmforLDA.
LDA is a simple model, and although we view it as a competitor to methods such as LSI and
pLSI in the setting of dimensionality reduction for document collections and other discrete cor-
pora, it is also intended to be illustrative of the way in which probabilistic models can be scaled
up to provide useful inferential machinery in domains involving multiple levels of structure. In-
deed,theprincipaladvantagesofgenerativemodelssuchasLDAincludetheirmodularityandtheir
extensibility. Asaprobabilisticmodule,LDAcanbereadilyembeddedinamorecomplexmodel—
a property that is not possessed by LSI. In recent work we have used pairs of LDA modules to
modelrelationshipsbetweenimagesandtheircorrespondingdescriptivecaptions(BleiandJordan,
2002). Moreover, there are numerous possible extensions of LDA. For example, LDA is readily
extendedtocontinuousdataorothernon-multinomialdata. Asisthecaseforothermixturemodels,
including finite mixture models and hidden Markov models, the “emission” probability p(w jz )
n n
contributes only a likelihood value to the inference procedures for LDA, and other likelihoods are
readilysubstitutedinitsplace. Inparticular,itisstraightforwardtodevelopacontinuousvariantof
LDA in which Gaussian observables are used in place of multinomials. Another simple extension
ofLDAcomesfromallowingmixturesofDirichletdistributionsintheplaceofthesingleDirichlet
of LDA. This allows a richer structure in the latent topic space and in particular allows a form of
documentclusteringthatisdifferentfromtheclusteringthatisachievedviasharedtopics. Finally,
a variety of extensions of LDA can be considered in which the distributions on the topic variables
are elaborated. For example, we could arrange the topics in a time series, essentially relaxing the
fullexchangeabilityassumptiontooneofpartialexchangeability. Wecouldalsoconsiderpartially
exchangeable models in which we condition on exogenous variables; thus, for example, the topic
distribution could be conditioned on features such as “paragraph” or “sentence,” providing a more
powerfultextmodelthatmakesuseofinformationobtainedfromaparser.
Acknowledgements
This work was supported by the National Science Foundation (NSF grant IIS-9988642) and the
Multidisciplinary Research Program of the Department of Defense (MURI N00014-00-1-0637).
Andrew Y. Ng and David M. Blei were additionally supported by fellowships from the Microsoft
Corporation.
References
M. Abramowitz and I. Stegun, editors. Handbook of Mathematical Functions. Dover, New York,
1970.
1015

BLEI,NG,ANDJORDAN
D.Aldous. Exchangeabilityandrelatedtopics. InE´coled’e´te´ deprobabilite´sdeSaint-Flour,XIII—
1983,pages1–198.Springer,Berlin,1985.
H.Attias. AvariationalBayesianframeworkforgraphicalmodels. InAdvancesinNeuralInforma-
tionProcessingSystems12,2000.
L. Avery. Caenorrhabditis genetic center bibliography. 2002. URL
http://elegans.swmed.edu/wli/cgcbib.
R.Baeza-YatesandB.Ribeiro-Neto. ModernInformationRetrieval. ACMPress,NewYork,1999.
D. Blei and M. Jordan. Modeling annotated data. Technical Report UCB//CSD-02-1202, U.C.
BerkeleyComputerScienceDivision,2002.
B. de Finetti. Theory of probability. Vol. 1-2. John Wiley & Sons Ltd., Chichester, 1990. Reprint
ofthe1975translation.
S. Deerwester, S. Dumais, T. Landauer, G. Furnas, and R. Harshman. Indexing by latent semantic
analysis. JournaloftheAmericanSocietyofInformationScience,41(6):391–407,1990.
P. Diaconis. Recent progress on de Finetti’s notions of exchangeability. In Bayesian statistics, 3
(Valencia,1987),pages111–125.OxfordUniv.Press,NewYork,1988.
J. Dickey. Multiple hypergeometric functions: Probabilistic interpretations and statistical uses.
JournaloftheAmericanStatisticalAssociation,78:628–637,1983.
J.Dickey, J.Jiang, andJ.Kadane. Bayesianmethodsforcensoredcategoricaldata. Journalofthe
AmericanStatisticalAssociation,82:773–781,1987.
A.Gelman, J.Carlin, H.Stern, andD.Rubin. Bayesiandataanalysis. Chapman &Hall, London,
1995.
T. Griffiths and M. Steyvers. A probabilistic approach to semantic representation. In Proceedings
ofthe24thAnnualConferenceoftheCognitiveScienceSociety,2002.
D. Harman. Overview of the first text retrieval conference (TREC-1). In Proceedings of the First
TextRetrievalConference(TREC-1),pages1–20,1992.
D. Heckerman and M. Meila. An experimental comparison of several clustering and initialization
methods. MachineLearning,42:9–29,2001.
T. Hofmann. Probabilistic latent semantic indexing. Proceedings of the Twenty-Second Annual
InternationalSIGIRConference,1999.
F.Jelinek. StatisticalMethodsforSpeechRecognition. MITPress,Cambridge,MA,1997.
T.Joachims. Makinglarge-scaleSVMlearningpractical. InAdvancesinKernelMethods-Support
VectorLearning.M.I.T.Press,1999.
M.Jordan,editor. LearninginGraphicalModels. MITPress,Cambridge,MA,1999.
1016

LATENTDIRICHLETALLOCATION
M.Jordan,Z.Ghahramani,T.Jaakkola,andL.Saul. Introductiontovariationalmethodsforgraph-
icalmodels. MachineLearning,37:183–233,1999.
R.KassandD.Steffey. ApproximateBayesianinferenceinconditionallyindependenthierarchical
models(parametricempiricalBayesmodels). JournaloftheAmericanStatisticalAssociation,84
(407):717–726,1989.
M. Leisink and H. Kappen. General lower bounds based on computer generated higher order ex-
pansions. In Uncertainty in Artificial Intelligence, Proceedings of the Eighteenth Conference,
2002.
T.Minka. EstimatingaDirichletdistribution. Technicalreport,M.I.T.,2000.
T.P.MinkaandJ.Lafferty.Expectation-propagationforthegenerativeaspectmodel.InUncertainty
inArtificialIntelligence(UAI),2002.
C.Morris. ParametricempiricalBayesinference: Theoryandapplications. JournaloftheAmerican
StatisticalAssociation,78(381):47–65,1983. Withdiscussion.
K.Nigam,J.Lafferty,andA.McCallum. Usingmaximumentropyfortextclassification. IJCAI-99
WorkshoponMachineLearningforInformationFiltering,pages61–67,1999.
K.Nigam,A.McCallum,S.Thrun,andT.Mitchell. Textclassificationfromlabeledandunlabeled
documentsusingEM. MachineLearning,39(2/3):103–134,2000.
C. Papadimitriou, H. Tamaki, P. Raghavan, and S. Vempala. Latent semantic indexing: A proba-
bilisticanalysis. pages159–168,1998.
A.Popescul,L.Ungar,D.Pennock,andS.Lawrence. Probabilisticmodelsforunifiedcollaborative
and content-based recommendation in sparse-data environments. In Uncertainty in Artificial
Intelligence,ProceedingsoftheSeventeenthConference,2001.
J.Rennie.Improvingmulti-classtextclassificationwithnaiveBayes.TechnicalReportAITR-2001-
004,M.I.T.,2001.
G.Ronning. MaximumlikelihoodestimationofDirichletdistributions. JournalofStatistcalCom-
putationandSimulation,34(4):215–221,1989.
G. Salton and M. McGill, editors. Introduction to Modern Information Retrieval. McGraw-Hill,
1983.
AppendixA. Inferenceandparameterestimation
In this appendix, we derive the variational inference procedure (Eqs. 6 and 7) and the parameter
maximizationprocedurefortheconditionalmultinomial(Eq.9)andfortheDirichlet. Webeginby
derivingausefulpropertyoftheDirichletdistribution.
1017

BLEI,NG,ANDJORDAN
| ComputingE[log(q |     |     | ja )] |     |     |     |     |     |
| ---------------- | --- | --- | ----- | --- | --- | --- | --- | --- |
| A.1              |     |     | i     |     |     |     |     |     |
The need to compute the expected value of the log of a single probability component under the
DirichletarisesrepeatedlyinderivingtheinferenceandparameterestimationproceduresforLDA.
This value can be easily computed from the natural parameterization of the exponential family
representationoftheDirichletdistribution.
Recallthatadistributionisintheexponentialfamilyifitcanbewrittenintheform:
|     |     |     |       |           | (cid:8)     |     | (cid:9) |     |
| --- | --- | --- | ----- | --------- | ----------- | --- | ------- | --- |
|     |     |     | p(xjh | )=h(x)exp | h TT(x)−A(h |     | ) ,     |     |
| h   |     |     |       | T(x)      |             |     | A(h )   |     |
where is the natural parameter, is the sufficient statistic, and is the log of the normal-
izationfactor.
WecanwritetheDirichletinthisformbyexponentiatingthelogofEq.(1):
|     |     |          | (cid:8)(cid:0) |            | (cid:1) | (cid:0)       | (cid:1)           | (cid:9) |
| --- | --- | -------- | -------------- | ---------- | ------- | ------------- | ----------------- | ------- |
|     | p(q | ja )=exp | (cid:229) k    | (a −1)logq | +logG   | (cid:229) k a | −(cid:229) k logG | (a ) .  |
|     |     |          | i=1            |            |         | i=1           | i=1               |         |
|     |     |          |                | i          | i       |               | i                 | i       |
From this form, we immediately see that the natural parameter of the Dirichlet is h =a −1 and
i i
the sufficient statistic is T(q )=logq . Furthermore, using the general fact that the derivative of
|     |     |     | i   | i   |     |     |     |     |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
thelognormalizationfactorwithrespecttothenaturalparameterisequaltotheexpectationofthe
sufficientstatistic,weobtain:
(cid:0) (cid:1)
|     |     |     | E[logq | ja  | ]=Y (a )−Y | (cid:229) k a |     |     |
| --- | --- | --- | ------ | --- | ---------- | ------------- | --- | --- |
|     |     |     |        | i   | i          | j=1           | j   |     |
whereY
isthedigammafunction,thefirstderivativeofthelogGammafunction.
A.2 Newton-RaphsonmethodsforaHessianwithspecialstructure
In this section we describe a linear algorithm for the usually cubic Newton-Raphson optimization
method. ThismethodisusedformaximumlikelihoodestimationoftheDirichletdistribution(Ron-
ning,1989,Minka,2000).
TheNewton-Raphsonoptimizationtechniquefindsastationarypointofafunctionbyiterating:
)−1g(a
|     |     |       |     | a =a | −H(a    |     | )   |     |
| --- | --- | ----- | --- | ---- | ------- | --- | --- | --- |
|     |     |       |     | new  | old old | old |     |     |
| H(a | )   | g(a ) |     |      |         |     |     | a   |
where and are the Hessian matrix and gradient respectively at the point . In general,
thisalgorithmscalesasO(N3)duetothematrixinversion.
IftheHessianmatrixisoftheform:
=diag(h)+1z1T,
H (10)
wherediag(h)isdefinedtobeadiagonalmatrixwiththeelementsofthevectorhalongthediagonal,
thenwecanapplythematrixinversionlemmaandobtain:
diag(h)−111Tdiag(h)−1
H −1=diag(h)−1−
−1
|     |     |     |     |     | z−1+(cid:229) | k h |     |     |
| --- | --- | --- | --- | --- | ------------- | --- | --- | --- |
j=1 j
Multiplyingbythegradient,weobtaintheithcomponent:
−c
|     |     |     |     |     | −1g) g i |     |     |     |
| --- | --- | --- | --- | --- | -------- | --- | --- | --- |
|     |     |     |     | (H  | =        |     |     |     |
i
|     |     |     |     |     | h   | i   |     |     |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
1018

LATENTDIRICHLETALLOCATION
where
|     |     |     |     |               | (cid:229) k g /h |     |     |     |
| --- | --- | --- | --- | ------------- | ---------------- | --- | --- | --- |
|     |     |     |     |               | j=1 j j          |     |     |     |
|     |     |     |     | c=            | .                |     |     |     |
|     |     |     |     | z−1+(cid:229) | k −1             |     |     |     |
h
j=1 j
Observe that this expression depends only on the 2k values h and g and thus yields a Newton-
i i
Raphsonalgorithmthathaslineartimecomplexity.
A.3 Variationalinference
In this section we derive the variational inference algorithm described in Section 5.1. Recall that
thisinvolvesusingthefollowingvariationaldistribution:
N
)(cid:213)
|     |     |     | q(q | ,zjg ,f )=q(q | jg q(z | jf ) |     | (11) |
| --- | --- | --- | --- | ------------- | ------ | ---- | --- | ---- |
n n
n=1
|                                         |     |     |     | p(q | ,z,wja ,b ),wherethevariationalparametersg |     |     |     |
| --------------------------------------- | --- | --- | --- | --- | ------------------------------------------ | --- | --- | --- |
| asasurrogatefortheposteriordistribution |     |     |     |     |                                            |     |     | and |
f
aresetviaanoptimizationprocedurethatwenowdescribe.
Following Jordan et al. (1999), we begin by bounding the log likelihood of a document using
| Jensen’sinequality. |     | Omittingtheparametersg |     |     | andf forsimplicity,wehave: |     |     |     |
| ------------------- | --- | ---------------------- | --- | --- | -------------------------- | --- | --- | --- |
Z
(cid:229)
|     | logp(wja | ,b ) = | log | p(q ,z,wja | ,b )dq |     |     |     |
| --- | -------- | ------ | --- | ---------- | ------ | --- | --- | --- |
Z z
|     |     |     |     | p(q ,z,wja | ,b )q(q ,z) |     |     |     |
| --- | --- | --- | --- | ---------- | ----------- | --- | --- | --- |
(cid:229)
|     |     | =        | log       |           | dq              |                 |       |      |
| --- | --- | -------- | --------- | --------- | --------------- | --------------- | ----- | ---- |
|     |     |          |           |           | q(q ,z)         |                 |       |      |
|     |     |          | Z         | z         |                 | Z               |       |      |
|     |     |          | (cid:229) |           |                 | (cid:229)       |       |      |
|     |     | (cid:21) | q(q       | ,z)logp(q | ,z,wja ,b )dq   | − q(q ,z)logq(q | ,z)dq |      |
|     |     |          | z         |           |                 | z               |       |      |
|     |     | =        | [logp(q   | ,z,wja    | ,b )]−E [logq(q | ,z)].           |       |      |
|     |     |          | E         |           |                 |                 |       | (12) |
|     |     |          | q         |           | q               |                 |       |      |
Thus we see that Jensen’s inequality provides us with a lower bound on the log likelihood for an
| arbitraryvariationaldistributionq(q |     |     |     | ,zjg ,f ). |     |     |     |     |
| ----------------------------------- | --- | --- | --- | ---------- | --- | --- | --- | --- |
It can be easily verified that the difference between the left-hand side and the right-hand side
of the Eq. (12) is the KL divergence between the variational posterior probability and the true
posteriorprobability. Thatis, lettingL(g ,f ;a ,b )denotetheright-handsideofEq.(12)(wherewe
| haverestoredthedependenceonthevariationalparametersg |     |     |     |     |     | andf |     |     |
| ---------------------------------------------------- | --- | --- | --- | --- | --- | ---- | --- | --- |
inournotation),wehave:
logp(wja ,b )=L(g ,f ;a ,b )+D(q(q ,zjg ,f )k p(q ,zjw,a ,b )). (13)
This shows that maximizing the lower bound L(g ,f ;a ,b ) with respect to g and f is equivalent to
minimizing the KL divergence between the variational posterior probability and the true posterior
probability,theoptimizationproblempresentedearlierinEq.(5).
| Wenowexpandthelowerboundbyusingthefactorizationsof |     |                  |            |         |            | pandq:           |     |      |
| -------------------------------------------------- | --- | ---------------- | ---------- | ------- | ---------- | ---------------- | --- | ---- |
|                                                    |     | L(g ,f ;a ,b )=E | [logp(q    | ja )]+E | [logp(zjq  | )]+E [logp(wjz,b | )]  |      |
|                                                    |     |                  | q          |         | q          | q                |     | (14) |
|                                                    |     |                  | −E [logq(q | )]−E    | [logq(z)]. |                  |     |      |
|                                                    |     |                  | q          |         | q          |                  |     |      |
1019

BLEI,NG,ANDJORDAN
Finally,weexpandEq.(14)intermsofthemodelparameters(a ,b )andthevariationalparameters
(g ,f ). Eachofthefivelinesbelowexpandsoneofthefivetermsinthebound:
(cid:0) (cid:1) k k (cid:0) (cid:0) (cid:1)(cid:1)
L(g ,f ;a ,b )=logG (cid:229) k a −(cid:229) logG (a )+(cid:229) (a −1) Y (g )−Y (cid:229) k g
j=1 j i i i j=1 j
i=1 i=1
N k (cid:0) (cid:0) (cid:1)(cid:1)
+(cid:229) (cid:229) f Y (g )−Y (cid:229) k g
ni i j=1 j
n=1i=1
N k V
+(cid:229) (cid:229) (cid:229) f wjlogb (15)
ni n ij
n=1i=1j=1
(cid:0) (cid:1) k k (cid:0) (cid:0) (cid:1)(cid:1)
−logG (cid:229) k g +(cid:229) logG (g )−(cid:229) (g −1) Y (g )−Y (cid:229) k g
j=1 j i i i j=1 j
i=1 i=1
N k
−(cid:229) (cid:229) f logf ,
ni ni
n=1i=1
wherewehavemadeuseofEq.(8).
In the following two sections, we show how to maximize this lower bound with respect to the
variationalparametersf andg .
A.3.1 VARIATIONAL MULTINOMIAL
We first maximize Eq. (15) with respect to f , the probability that the nth word is generated by
ni
latenttopici. Observethatthisisaconstrainedmaximizationsince(cid:229) k f =1.
i=1 ni
We form the Lagrangian by isolating the terms which contain f and adding the appropriate
ni
Lagrange multipliers. Let b be p(wv =1jzi =1) for the appropriate v. (Recall that each w is
iv n n
a vector of sizeV with exactly one component equal to one; we can select the unique v such that
wv =1):
n
(cid:0) (cid:0) (cid:1)(cid:1) (cid:0) (cid:1)
L[f
ni
] =f ni Y (g i )−Y (cid:229) k j=1 g j +f ni logb iv −f ni logf ni +l n (cid:229) k j=1 f ni −1 ,
wherewehavedroppedtheargumentsofL forsimplicity,andwherethesubscriptf denotesthat
ni
wehaveretainedonlythosetermsinL thatareafunctionoff . Takingderivativeswithrespectto
ni
f ,weobtain:
ni
¶ L (cid:0) (cid:1)
=Y (g )−Y (cid:229) k g +logb −logf −1+l .
¶f i j=1 j iv ni
ni
Settingthisderivativetozeroyieldsthemaximizingvalueofthevariationalparameterf (cf.Eq.6):
ni
(cid:0) (cid:0) (cid:1)(cid:1)
f (cid:181)b exp Y (g )−Y (cid:229) k g . (16)
ni iv i j=1 j
1020

LATENTDIRICHLETALLOCATION
| A.3.2 VARIATIONAL |     | DIRICHLET |     |     |     |     |     |     |     |     |
| ----------------- | --- | --------- | --- | --- | --- | --- | --- | --- | --- | --- |
Next,wemaximizeEq.(15)withrespecttog
i ,theithcomponentoftheposteriorDirichletparam-
| eter. Thetermscontainingg |     | are: |     |     |     |     |     |     |     |     |
| ------------------------- | --- | ---- | --- | --- | --- | --- | --- | --- | --- | --- |
i
|     |             |           | (cid:0)   | (cid:0)     | (cid:1)(cid:1) |              | (cid:0)  | (cid:0)   | (cid:1)(cid:1) |     |
| --- | ----------- | --------- | --------- | ----------- | -------------- | ------------ | -------- | --------- | -------------- | --- |
|     | (cid:229) k |           |           |             |                | +(cid:229) N |          |           |                |     |
| L[g | =           | (a −1)    | Y (g )−Y  | (cid:229) k | g              | f            | Y (g )−Y | (cid:229) | k g            |     |
|     | ]           | i         | i         |             | j=1 j          | ni           | i        |           | j=1 j          |     |
|     | i=1         |           |           |             |                | n=1          |          |           |                |     |
|     |             | (cid:0)   | (cid:1)   |             |                | (cid:0)      |          | (cid:0)   | (cid:1)(cid:1) |     |
|     |             |           |           |             | )−(cid:229) k  |              |          |           |                |     |
|     | −logG       | (cid:229) | k g +logG | (g          |                | (g −1)       | Y (g )−Y | (cid:229) | k g            | .   |
|     |             |           | j=1 j     |             | i              | i            | i        |           | j=1 j          |     |
i=1
Thissimplifiesto:
|     | k (cid:0) |     | (cid:0) | (cid:1)(cid:1)(cid:0) |     | (cid:1) | (cid:0) |     | (cid:1) |     |
| --- | --------- | --- | ------- | --------------------- | --- | ------- | ------- | --- | ------- | --- |
(cid:229)
L[g = Y (g )−Y (cid:229) k g a +(cid:229) N f −g −logG (cid:229) k g +logG (g ).
| ]   |     | i   | j=1 j | i   | n=1 | ni i |     | j=1 | j   | i   |
| --- | --- | --- | ----- | --- | --- | ---- | --- | --- | --- | --- |
i=1
Wetakethederivativewithrespecttog :
i
| ¶   |     | (cid:0)        |     | (cid:1) | (cid:0)      | (cid:1) k | (cid:0)      |     |      | (cid:1) |
| --- | --- | -------------- | --- | ------- | ------------ | --------- | ------------ | --- | ---- | ------- |
| L   | 0(g |                |     |         | 0            | (cid:229) |              |     |      |         |
|     | =Y  | ) a +(cid:229) | N f | −g      | −Y (cid:229) | k g       | a +(cid:229) | N   | f −g | .       |
| ¶g  |     | i i            | n=1 | ni i    |              | j=1 j     | j            | n=1 | nj   | j       |
i
j=1
Settingthisequationtozeroyieldsamaximumat:
|     |     |     |     | g =a | +(cid:229) N | f . |     |     |     |      |
| --- | --- | --- | --- | ---- | ------------ | --- | --- | --- | --- | ---- |
|     |     |     |     |      | n=1          |     |     |     |     | (17) |
|     |     |     |     | i    | i            | ni  |     |     |     |      |
Since Eq. (17) depends on the variational multinomial f , full variational inference requires
alternatingbetweenEqs.(16)and(17)untiltheboundconverges.
A.4 Parameterestimation
In this final section, we consider the problem of obtaining empirical Bayes estimates of the model
a b
parameters and . We solve this problem by using the variational lower bound as a surrogate
for the (intractable) marginal log likelihood, with the variational parameters f and g fixed to the
valuesfoundbyvariationalinference. Wethenobtain(approximate)empiricalBayesestimatesby
maximizingthislowerboundwithrespecttothemodelparameters.
We have thus far considered the log likelihood for a single document. Given our assumption
ofexchangeabilityforthedocuments,theoverallloglikelihoodofacorpusD =fw ,w ,...,w g
|     |     |     |     |     |     |     |     |     |     | 1 2 M |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | ----- |
is the sum of the log likelihoods for individual documents; moreover, the overall variational lower
bound is the sum of the individual variational bounds. In the remainder of this section, we abuse
notation by using L for the total variational bound, indexing the document-specific terms in the
individualboundsbyd,andsummingoverallthedocuments.
RecallfromSection5.3thatouroverallapproachtofindingempiricalBayesestimatesisbased
onavariationalEMprocedure. InthevariationalE-step,discussedinAppendixA.3,wemaximize
theboundL(g ,f ;a ,b )withrespecttothevariationalparametersg andf . IntheM-step, whichwe
describeinthissection,wemaximizetheboundwithrespecttothemodelparametersa andb . The
overallprocedurecanthusbeviewedascoordinateascentinL.
1021

BLEI,NG,ANDJORDAN
A.4.1 CONDITIONAL MULTINOMIALS
Tomaximizewithrespecttob ,weisolatetermsandaddLagrangemultipliers:
(cid:16) (cid:17)
L[b ] = (cid:229)
M
(cid:229)
Nd
(cid:229)
k
(cid:229)
V
f dni w d j n logb ij +(cid:229)
k
l i (cid:229) V j=1 b ij −1 .
d=1n=1i=1j=1 i=1
Wetakethederivativewithrespecttob ,setittozero,andfind:
ij
b (cid:181) (cid:229)
M
(cid:229)
Nd
f w j .
ij dni dn
d=1n=1
A.4.2 DIRICHLET
Thetermswhichcontaina are:
!
M (cid:0) (cid:1) k k (cid:0) (cid:0) (cid:0) (cid:1)(cid:1)(cid:1)
L[a ] = (cid:229) logG (cid:229) k j=1 a j −(cid:229) logG (a i )+(cid:229) (a i −1) Y (g di )−Y (cid:229) k j=1 g dj
d=1 i=1 i=1
Takingthederivativewithrespecttoa gives:
i
¶ L =M (cid:0) Y (cid:0) (cid:229) k a (cid:1) −Y (a ) (cid:1) + (cid:229) M (cid:0) Y (g )−Y (cid:0) (cid:229) k g (cid:1)(cid:1)
¶a j=1 j i di j=1 dj
i d=1
This derivative depends on a , where j6=i, and we therefore must use an iterative method to find
j
themaximala . Inparticular,theHessianisintheformfoundinEq.(10):
¶ L (cid:0) (cid:1)
=d (i,j)MY 0(a )−Y 0 (cid:229) k a ,
¶a a i j=1 j
i j
andthuswecaninvokethelinear-timeNewton-RaphsonalgorithmdescribedinAppendixA.2.
Finally,notethatwecanusethesamealgorithmtofindanempiricalBayespointestimateofh ,
thescalarparameterfortheexchangeableDirichletinthesmoothedLDAmodelinSection5.4.
1022