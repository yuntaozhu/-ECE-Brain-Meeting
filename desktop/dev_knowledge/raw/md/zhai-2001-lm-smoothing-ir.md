A Study of Smoothing Methods for Language Models
Applied to Ad Hoc Information Retrieval
Chengxiang Zhai John Lafferty
SchoolofComputerScience SchoolofComputerScience
CarnegieMellonUniversity CarnegieMellonUniversity
Pittsburgh,PA15213 Pittsburgh,PA15213
ABSTRACT trieval [13, 1, 10, 5]. The basic idea behind the new ap-
proach is extremely simple—estimate a language model for
Language modeling approaches to information retrieval are
each document, and rank documents by the likelihood of
attractive andpromising becausetheyconnect theproblem
the query according to the language model. Yet this new
of retrieval with that of language model estimation, which
framework is very promising, because of its foundations in
hasbeenstudiedextensivelyinotherapplication areassuch
statistical theory,thegreat deal of complementary work on
asspeechrecognition. Thebasicideaoftheseapproachesis
language modeling in speech recognition and natural lan-
to estimate a language model for each document, and then
guage processing, and the fact that very simple language
rank documentsbythelikelihood of thequeryaccording to
modeling retrieval methods have performed quite well em-
the estimated language model. A core problem in language
pirically.
modelestimationissmoothing,whichadjuststhemaximum
Thetermsmoothing referstotheadjustmentofthemaxi-
likelihood estimator so as to correct the inaccuracy due to
mumlikelihoodestimatorofalanguagemodelsothatitwill
datasparseness. Inthispaper,westudytheproblemoflan-
bemoreaccurate. Attheveryleast,itisrequiredtonotas-
guagemodelsmoothinganditsinfluenceonretrievalperfor-
sign a zero probability to unseen words. When estimating
mance. Weexaminethesensitivityofretrievalperformance
a language model based on a limited amount of text, such
to the smoothing parameters and compare several popular
asasingledocument,smoothingofthemaximumlikelihood
smoothing methods on different test collections.
modelisextremelyimportant. Indeed,manylanguagemod-
elingtechniquesarecenteredaroundtheissueofsmoothing.
1. INTRODUCTION Inthelanguagemodelingapproachtoretrieval,theaccuracy
ofsmoothingisdirectlyrelatedtotheretrievalperformance.
The studyof information retrieval models has a long his-
Yet most existing research work has assumed one method
tory. Over the decades, many different types of retrieval
oranotherforsmoothing,andthesmoothingeffecttendsto
modelshavebeenproposedandtested[21]. Therehasbeen
bemixedwiththatofotherheuristictechniques. Therehas
agreatdiversityofapproachesandmethodologydeveloped,
been no direct evaluation of different smoothing methods,
rather thana single unified retrievalmodel that has proven
and it is unclear how the retrieval performance is affected
tobemosteffective;however,thefieldhasprogressedintwo
by thechoice of a smoothing method and its parameters.
different ways. On the one hand, theoretical studies of an
In this paper, we study the problem of language model
underlyingmodelhavebeendeveloped;thisdirectionis,for
smoothing in the context of ad hoc retrieval, focusing on
example, represented by the various kinds of logic models
the smoothing of document language models. The research
andprobabilisticmodels(e.g.,[14,3,15,22]). Ontheother
questions that motivate this work are (1) how sensitive is
hand,therehavebeenmanyempiricalstudiesofmodels,in-
retrieval performance to the smoothing of a document lan-
cluding many variants of the vector space model (e.g., [17,
guage model? (2) how should a smoothing method be se-
18, 19]). In some cases, there havebeen theoretically moti-
lected, and how should its parameters be chosen? We com-
vated models that also perform well empirically; for exam-
pare several of the most popular smoothing methods that
ple,theBM25retrievalfunction,motivatedbythe2-Poisson
havebeendevelopedinspeechandlanguageprocessing,and
probabilisticretrievalmodel,hasproventobequiteeffective
study thebehavior of each method.
in practice [16].
Our study leads to several interesting and unanticipated
Recently, a new approach based on language modeling
conclusions. Wefindthattheretrievalperformanceishighly
has been successfully applied to the problem of ad hoc re-
sensitive to the setting of smoothing parameters. In some
sense, smoothing is as important to this new family of re-
trievalmodelsastermweightingistothetraditionalmodels.
Interestingly,theeffectofsmoothingisverysensitivetothe
Permission tomake digital orhardcopies ofall orpartofthis workfor
personalorclassroomuseisgrantedwithoutfeeprovidedthatcopiesare type of queries, which suggests that smoothing plays two
notmadeordistributedforprofitorcommercialadvantageandthatcopies different roles in thequery-likelihood ranking method: One
bearthisnoticeandthefullcitationonthefirstpage.Tocopyotherwise,to role is to improve the accuracy of the estimated document
republish,topostonserversortoredistributetolists,requirespriorspecific language model, while the other is to accommodate gen-
permissionand/orafee.
eration of common and non-informative words in a query.
SIGIR’01,September9-12,2001,NewOrleans,Louisiana,USA
Differentsmoothingmethodshavebehavedsomehowdiffer-
Copyright2001ACM1-58113-331-6/01/0009...$5.00.
343
ACM SIGIR Forum 268 Vol. 51 No. 2, July 2017

ently. Somemethodstendtoperformbetterforconcisetitle
querieswhileotherstendtoperformbetterforlongverbose
queries. And some methods are more stable than others,
in the sense that their performance is less sensitive to the
choice of parameters.
2. THE LANGUAGEMODELING
APPROACH
The basic idea of the language modeling approach to in-
formation retrieval can be described as follows. We assume
thataqueryqis“generated”byaprobabilisticmodelbased
on an document d. Given a query q = q
1
q
2
...qn and a doc-
ument d = d
1
d
2
...dm, we are interested in estimating the
conditional probability p(d|q), i.e., the probability that d
generatestheobservedq. AfterapplyingtheBayes’formula
and dropping a document-independent constant (since we
are only interested in ranking documents), we have
p(d|q) ∝ p(q|d)p(d)
Asdiscussedin[1],therighthandsideoftheaboveequation
has an interesting interpretation, where, p(d) is our prior
beliefthatdisrelevanttoanyqueryandp(q|d)isthequery
likelihood giventhedocument,whichcaptureshowwellthe
document “fits” theparticular query q.
In the simplest case, p(d) is assumed to be uniform, and
so does not affect document ranking. This assumption has
been takeninmost existingwork [1, 13,12, 5, 20]. Inother
cases, p(d) can beused to capturenon-textualinformation,
e.g.,thelengthofadocumentorlinksinawebpage,aswell
as other format/style features of a document. Inour study,
we assume a uniform p(d) in order to focus on the effect
of smoothing. See [10] for an empirical study that exploits
simple alternative priors.
With a uniform prior, the retrieval model reduces to the
calculation of p(q|d), where language modeling comes in.
The language model used in most previous work is theuni-
gram model.1 This is the multinomial model which assigns
the probability
p(q|d) =
Y
of these models as follows, where c(w;d) denotes the count
of word w in d.
logp(q|d) =
p(qi|d)
i
Clearly, the retrieval problem is now essentially reduced to
a unigram language model estimation problem. In this pa-
per we focus on unigram models only; see [10, 20] for some
explorations of bigram and trigram models.
On the surface, the use of language models appears fun-
damentallydifferentfromvectorspacemodelswithTF-IDF
weighting schemes, because the unigram language model
only explicitly encodes term frequency—there appears to
be no use of inverse document frequency weighting in the
model. However,thereisaninterestingconnection between
thelanguagemodelapproachandtheheuristicsusedinthe
traditional models. This connection has much to do with
smoothing, and an appreciation of it helps to gain insight
into thelanguage modeling approach.
Most smoothing methods make use of two distributions,
a model p s(w|d) used for “seen” words that occur in the
document, and a model pu(w|d) for “unseen” words that
donot. Theprobabilityofaqueryqcanbewritteninterms
1The workof Ponte and Croft [13] adopts something similarto,
butslightlydifferentfromthestandardunigrammodel.
X
logp(qi|d)
i
=
X
logps(qi|d)+
i:c(qi;d)>0
X
logpu(qi|d)
i:c(qi;d)=0
=
X
log
ps(qi|d)
+
pu(qi|d)
i:c(qi;d)>0
X
logpu(qi|d)
i
The probability of an unseen word is typically taken as
being proportional to the general frequency of the word,
e.g., as computed using the document collection. So, let us
assumethatpu(qi|d)=α
d
p(qi|C),whereα
d
isadocument-
dependent constant and p(qi|C) is the collection language
model. Now we have
logp(q|d)=
X i:c(qi;d)>0
log
α
p
d
s
p
(q
(q
i
i
|
|
d
C
)
)
+nlogα d+
X
logp(qi|C)
i
wherenisthelengthofthequery. Notethatthelast term
ontherighthandsideisindependentofthedocumentd,and
thuscan beignored in ranking.
Nowwecanseethattheretrievalfunctioncanactuallybe
decomposedintotwoparts. Thefirstpartinvolvesaweight
for each term common between the query and document
(i.e., matched terms) and the second part only involves a
document-dependent constant that is related to how much
probability mass will be allocated to unseen words, accord-
ing to the particular smoothing method used. The weight
of a matched term q i can be identified as the logarithm of
ps(qi|d) , which is directly proportional to the document
αdp(qi|C)
term frequency, but inversely proportional to the collection
frequency.
Thus, the use of p(qi|C) as a reference smoothing distri-
butionhasturnedouttoplayaroleverysimilartothewell-
knownIDF.Theothercomponentintheformulaisjustthe
product of a document-dependent constant and the query
length. We can think of it as playing the role of document
lengthnormalization, whichisanotherimportanttechnique
to improve performance in traditional models. Indeed, α
d
should be closely related to thedocument length, since one
would expect that a longer document needs less smoothing
andthusasmallerα ;thusalongdocumentincursagreater
d
penalty than a short one because of this term.
The connection just derived shows that the use of the
collection language model as a reference model for smooth-
ing document language models implies a retrieval formula
thatimplementsTF-IDFweightingheuristicsanddocument
lengthnormalization. Thissuggests thatsmoothingplaysa
key role in the language modeling approaches to retrieval.
A more restrictive derivation of the connection was given
in [5].
3. SMOOTHINGMETHODS
As described above, our goal is to estimate p(w|d), a
unigramlanguagemodelbasedonagivendocumentd. The
simplestmethodisthemaximumlikelihoodestimate,simply
given byrelative counts
c(w;d) p (w|d) =
ml
P
c(w;d)
w
344
ACM SIGIR Forum 269 Vol. 51 No. 2, July 2017

Method ps(w|d) α
d
Parameter
Jelinek-Mercer (1−λ)p (w|d)+λp(w|C) λ λ
ml
c(w;d)+µp(w|C)
Dirichlet
P
µ
c(w;d)+µ
w
P
µ
c(w;d)+µ
w
max(c(w;d)−δ,0)
Absolutediscount
P
+
δ|d|
up(w|C)
δ|d|u
δ
c(w;d) |d| |d|
w
Table 1: Summary of the three primary smoothing methods compared in this paper.
However, the maximum likelihood estimator will generally
under-estimate the probability of any word unseen in the
document,andsothemainpurposeofsmoothingistoassign
anon-zeroprobabilitytotheunseenwordsandimprovethe
accuracy of word probability estimation in general.
There are many smoothing methods that have been pro-
posed,mostlyinthecontextofspeechrecognition tasks[2].
In general, all smoothing methods are trying to discount
the probabilities of the words seen in the text, and to then
assign the extra probability mass to the unseen words ac-
cordingtosome“fallback”model. Forinformationretrieval,
itmakesmuchsense,andisverycommon,toexploitthecol-
lectionlanguagemodelasthefallbackmodel. Following[2],
we assume the general form of a smoothed model to be the
following:
p(w|d) =
(cid:26)
ps(w|d) if word w is seen
α p(w|C) otherwise d
whereps(w|d)isthesmoothedprobabilityofawordseenin
thedocument,p(w|C)isthecollectionlanguagemodel,and
α is a coefficient controlling the probability mass assigned
d
to unseen words, so that all probabilities sum to one. In
general, α
d
may depend on d. Indeed, if ps(w|d) is given,
we must have
1−
α = d
P
w:c(w;d)>0
ps(w|d)
1−
P
Thus, this is a simple mixture model (but we preserve the
name of themore general Jelinek-Mercer method which in-
volves deleted-interpolation estimation of linearly interpo-
lated n-gram models).
Bayesian smoothing using Dirichlet priors. A language
model is a multinomial distribution, for which the conju-
gatepriorfor Bayesian analysis istheDirichlet distribution
with parameters
(µp(w
1
|C), µp(w
2
|C), ..., µp(wn|C))
Thus, themodel is given by
c(w;d)+µp(w|C)
pµ(w|d) =
p(w|C)
w:c(w;d)>0
Thus,individualsmoothingmethodsessentiallydifferintheir
choice of ps(w|d).
Asmoothingmethodmaybeassimpleasaddinganextra
counttoeveryword(calledadditive,orLaplacesmoothing),
ormoresophisticatedasinKatzsmoothing,wherewordsof
different count are treated differently. However, because a
retrieval task typically requires efficient computations over
alarge collection ofdocuments,ourstudyisconstrained by
the efficiency of the smoothing method. We selected three
representative methods that are popular and relatively effi-
cienttoimplement. Weexcludedsomewell-knownmethods,
suchasKatzsmoothing[7]andGood-Turingestimation[4],
becauseoftheefficiencyconstraint2. Althoughthemethods
we evaluated are simple, the issues that they bring to light
arerelevanttomoreadvancedmethods. Thethreemethods
are described below.
The Jelinek-Mercer method. Thismethodinvolvesalin-
earinterpolationofthemaximumlikelihoodmodelwiththe
collection model, using a coefficient λ to control the influ-
ence of each model.
p (w|d) = (1−λ)p (w|d)+λp(w|C) (1)
λ ml
2They involve the count of words with the same frequency in a
document, whichisexpensivetocompute.
P
(2)
c(w;d)+µ
w
The Laplace method is a special case of this technique.
Absolute discounting. The idea of the absolute discount-
ingmethodistolowertheprobabilityofseenwordsbysub-
tracting a constant from their counts [11]. It is similar to
the Jelinek-Mercer method, but differs in that it discounts
theseenwordprobabilitybysubtractingaconstantinstead
of multiplyingit by (1-λ). Themodel is given by
max(c(w;d)−δ,0)
p (w|d) =
δ
P
+σp(w|C) (3)
c(w;d)
w
whereδ ∈[0,1]isadiscountconstantandσ=δ|d| /|d|,so
u
that all probabilities sum to one. Here |d| is the number
u ofunique termsindocumentd,and|d|isthetotalcountof
words in thedocument, so that |d|=
P
c(w;d).
w
ThethreemethodsaresummarizedinTable1intermsof
p s(w|d)andα d inthegeneralform. Itiseasytoseethata
larger parameter value means more smoothing in all cases.
Retrieval using any of the three methods can be imple-
mented very efficiently, when the smoothing parameter is
given in advance. The α’s can bepre-computedfor all doc-
umentsatindextime. Theweightofamatchedtermw can
be computed easily based on the collection language model
p(w|C), the query term frequency c(w;q), the document
term frequency c(w;d), and the smoothing parameters. In-
deed,thescoringcomplexityforaqueryqisO(k |q|),where
|q|isthequerylength,andk istheaveragenumberofdoc-
uments in which a query term occurs. It is as efficient as
scoring using a TF-IDFmodel.
4. EXPERIMENTAL SETUP
Our goal is to study the behavior of individual smooth-
ing methods as well as to compare different methods. As
iswell-known,theperformanceofaretrievalalgorithmmay
vary significantly according to the testing collection used.
It is generally desirable to have larger collections and more
queries. WeusethefollowingfivedatabasesfromTREC,in-
cludingthreeofthelargest testingcollectionsforadhocre-
trieval,i.e.,theofficialTREC7adhoc,TREC8adhoc,and
345
ACM SIGIR Forum 270 Vol. 51 No. 2, July 2017

0.4
0.35
0.3
0.25
0.2
0.15
0.1
0 0.2 0.4 0.6 0.8 1
noisicerp
Precision of Jelinek-Mercer (Small Collections)
0.8
0.7
0.6
fbis7T
fbis8T
ft7T
ft8T 0.5
la7T
la8T
fbis7L
fbis8L
ft7L
ft8L 0.4
la7L
la8L
0 0.2 0.4 0.6 0.8 1
lambda
llacer
Recall of Jelinek-Mercer (Small Collections)
fbis7T
fbis8T
ft7T
ft8T
la7T
la8T
fbis7L
fbis8L
ft7L
ft8L
la7L
la8L
lambda
0.3
0.25
0.2
0.15
0.1
0.05
0 0.2 0.4 0.6 0.8 1
noisicerp
Precision of Jelinek-Mercer (Large Collections)
0.8
0.7
0.6
0.5
0.4
trec7T
trec8T
web8T
t t r r e e c c 7 8 L L 0.3
web8L
0 0.2 0.4 0.6 0.8 1
lambda
llacer
Recall of Jelinek-Mercer (Large Collections)
trec7T
trec8T
web8T
trec7L trec8L
web8L
lambda
Figure 1: Performance of Jelinek-Mercer smoothing.
Document Queries
tion, weexperiment with awide range of parametervalues.
collection 351-400(Trec7) 401-450(Trec8)
Title Long Title Long In each run, the smoothing parameter is set to the same
FBIS fbis7T fbis7L fbis8T fbis8L value across all queries and documents. (While it is cer-
FT ft7T ft7L ft8T ft8L tainly possible toset the parameters differently for individ-
LA la7T la7L la8T la8L
TREC7&8 trec7T trec7L trec8T trec8L ual queries and documents through some kind of training
WEB N/A web8T web8L procedure, this is out of the scope of the present paper.)
For the purpose of studying the behavior of an individual
smoothingmethod,weselectasetofrepresentativeparame-
Table 2: Labels used for test collections. tervaluesandexaminethesensitivityofprecisionandrecall
tothevariationinthesevalues. Forthepurposeofcompar-
TREC8 web track testing collections: (1) Financial Times ingsmoothingmethods,wefirstoptimizetheperformanceof
ondisk4,(2)FBISondisk5,(3)LosAngelesTimesondisk eachmethodusingthenon-interpolatedaverageprecisionas
5,(4)Disk4anddisk5minusCR,usedfortheTREC7and the optimization criterion, and then compare the best runs
TREC8 ad hoc tasks, and (5) theTREC8 Web data. fromeachmethod. Theoptimalparameterisdeterminedby
Thequeriesweusearetopics351–400(usedfortheTREC7 searching overtheentire parameter space.3
ad hoc task), and topics 401–450 (used for the TREC8 ad
hoc and web tasks). In order to study the possible interac-
5. BEHAVIOROFINDIVIDUALMETHODS
tionofsmoothingandquerylength/type,weusetwodiffer-
ent versions of each set of queries: (1) title only, (2) long In this section, we study the behavior of each smooth-
version (title + description + narrative). The title queries ing method. We first derive the expected influence of the
aremostlytwoorthreekeywords,whereasthelongqueries smoothing parameter on the term weighting and document
havewhole sentences and are much more verbose. lengthnormalization impliedbythecorrespondingretrieval
In all our experiments, the only tokenization applied is function. Then, we examine thesensitivity of retrieval per-
stemming with a Porter stemmer. We deliberately indexed formance byplottingthenon-interpolatedprecision andre-
allthewordsinthelanguage,sincewedonotwanttobebi- call at 1,000 documents against the different values of the
asedbyanyartificialchoiceofstopwordsandwebelievethat smoothing parameter.
the effects of stop word removal should be better achieved Jelinek-Mercersmoothing. WhenusingtheJelinek-Mercer
by exploiting language modeling techniques. smoothingmethodwithafixedλ,weseethattheparameter
InTable2wegivethelabelsusedforallpossibleretrieval α d in our ranking function (see Section 2) is the same for
testing collections, based on the databases and queries de-
3Thesearchisperformedinaniterativeway,suchthateachiter-
scribed above. ation is more focused than the previous one. We stop searching
For each smoothing method and on each testing collec- whentheimprovementinaverageprecisionislessthan1%.
346
ACM SIGIR Forum 271 Vol. 51 No. 2, July 2017

Optimal Lambda and Range in Jelinek-Mercer for trec8T Optimal Lambda and Range in Jelinek-Mercer for trec8L
|     | 1      |       |     | 1      |     |     |
| --- | ------ | ----- | --- | ------ | --- | --- |
|     | 0.9    |       |     | 0.9    |     |     |
|     | 0.8    |       |     | 0.8    |     |     |
|     | 0.7    |       |     | 0.7    |     |     |
|     | 0.6    |       |     | 0.6    |     |     |
|     | adbmal |       |     | adbmal |     |     |
|     | 0.5    |       |     | 0.5    |     |     |
|     | 0.4    |       |     | 0.4    |     |     |
|     | 0.3    |       |     | 0.3    |     |     |
|     | 0.2    |       |     | 0.2    |     |     |
|     | 0.1    |       |     | 0.1    |     |     |
|     | 0      |       |     | 0      |     |     |
|     |        | query |     | query  |     |     |
Figure 2: Optimal λ range for trec8t (left) and trec8l (right) in Jelinek-Mercer smoothing. The line shows
| the optimal | value of λ and | the bars | are the optimal | ranges. |     |     |
| ----------- | -------------- | -------- | --------------- | ------- | --- | --- |
all documents, so the length normalization term is a con- toµforlongqueriesthanfortitlequeries,especiallywhenµ
stant. This means that the score can be interpreted as a is small. However, the optimal value of µ does not seem to
sum of weights over each matched term. The term weight bemuchdifferentfortitlequeriesandlongqueries. Whileit
is log(1+ (1−λ)p (qi|d)/(λp(qi|C))). Thus, a small λ stilltendstobeslightlylargerforlongqueries,thedifference
ml
meansmoreemphasisonrelativetermweighting. Indeed,if is not as large as in Jelinek-Mercer. The optimal prior µ
λ approaches one, then all term weights tend to zero, and seems to vary from collection to collection, though in most
thescoringformulaapproachescoordinationlevelmatching, cases, it is around 2,000. The tail of thecurves is generally
which is simply thecount of matched terms. flat, as it tends to the performance of coordination level
| TheplotsinFigure1showtheaverageprecisionandrecall |     |     |     | matching. |     |     |
| ------------------------------------------------- | --- | --- | --- | --------- | --- | --- |
Absolutediscounting.
for different settings of λ, for both large and small collec- Thetermweightingbehaviorofthe
tions. It is evident that both precision and recall are much absolute discounting method is a little more complicated.
more sensitive to λ for long queries than for title queries. Obviously, here α d is also document sensitive. It is larger
The web collection, however, is an exception, where perfor- foradocumentwithaflatterdistributionofwords,i.e.,when
mance is very sensitive to smoothing even for title queries. thecountofuniquetermsisrelativelylarge. Thus,itpenal-
Fortitlequeries,theretrievalperformancetendstobeopti- izesdocumentswithaworddistributionhighlyconcentrated
mizedwhenλissmall(around0.1),whereasforlongqueries, onasmallnumberofwords. Theweight ofamatchedterm
the optimal point is generally higher, and usually around islog(1+(c(q i;d)−δ)/(δ|d|up(qi|C))). Theinfluenceofδon
0.7. Thedifferenceintheoptimalλvaluesuggeststhatlong relative term weighting depends on |d|u and p(·|C), in the
queriesneedmoresmoothing,andlessemphasisisplacedon following way. If|d|up(w|C)>1, alarger δ will maketerm
the relative weighting of terms. The right end of the curve weightsflatter,butotherwise,itwillactuallymaketheterm
(when λ is very close to one) should be close to the perfor- weight more skewed according to the count of the term in
mance of coordination level matching. the document. Thus, a larger δ will amplify the weight dif-
Such sensitivity and trend can be seen more clearly from ferenceforrarewords,butflattenthedifferenceforcommon
the per-topic plot of the optimal range of λ shown in Fig- words, where the“rarity” threshold is p(w|C)<1/|d| u.
ure 2. The optimal range is defined as the maximum range The plots in Figure 4 show the average precision and re-
of λ values that deviate from the optimal average precision call for different settings of the discount constant δ. Once
by no more than 0.01. againitisclearthatbothprecisionandrecallaremuchmore
Dirichletpriors. WhenusingtheDirichletpriorforsmooth- sensitive to δ for long queriesthan for title queries. Similar
ing,weseethattheα intheretrievalformulaisdocument- to Bayesian smoothing, but different from Jelinek-Mercer
d
dependent. Itissmallerforlongdocuments,socanbeinter- smoothing,theoptimalvalueofδ doesnotseemtobemuch
preted as a length normalization component that penalizes different for title queries and long queries. Indeed, the op-
long documents. The weight for a matched term is now timal value of δ tends to be around 0.7. This is true not
log(1+c(q i;d)/(µp(qi|C))). Note that in the Jelinek Mer- only for both title queries and long queries, but also across
cer method, the term weight has a document length nor- all testing collections.
malization implicit in ps(qi|d), but herethe term weight is Thebehaviorofeachsmoothingmethodindicatesthat,in
affected by only the raw counts of a term, not the length general,theperformanceoflongerqueriesismuchmoresen-
of the document. After rewriting the weight as log(1 + sitive to the choice of the smoothing parameters than that
|d|p (qi|d)/(µp(qi|C))) we see that |d|/µ is playing the of title queries. This suggests that smoothing plays a more
ml
same role as (1−λ)/λ, but differs in that it is document- importantroleforlongverbosequeriesthanfortitlequeries
dependent. The relative weighting of terms is emphasized that are extremely concise. One interesting observation is
when we use a smaller µ. As µ gets large, α tends to 1, that the web collection has behaved quite differently than
d
andalltermweightstendtozero. Thus,thescoringformula other databases for Jelinek-Mercer and Dirichlet smooth-
tends to, again, that of coordination level matching. ing,butnotforabsolutediscounting. Inparticular,thetitle
TheplotsinFigure3showtheaverageprecisionandrecall queriesperformedmuchbetterthanthelongqueriesonthe
for different settings of the prior sample size µ. It is again webcollectionforDirichletprior. Furtheranalysisandeval-
clearthatbothprecisionandrecallaremuchmoresensitive uation are needed to understand this observation.
347
| ACM | SIGIR Forum |     |     | 272 | Vol. 51 | No. 2, July 2017 |
| --- | ----------- | --- | --- | --- | ------- | ---------------- |

0.4
0.35
0.3
0.25
0.2
0.15
0.1
0 500 1000 1500 2000 2500 3000 3500 4000 4500 5000
noisicerp
Precision of Dirichlet Prior (Small Collections)
0.8
0.7
0.6
fbis7T
fbis8T
ft7T
ft8T 0.5
la7T
la8T
fbis7L
fbis8L
ft7L
ft8L 0.4
la7L
la8L
0 500 1000 1500 2000 2500 3000 3500 4000 4500 5000
prior
llacer
Recall of Dirichlet Prior (Small Collections)
fbis7T
fbis8T
ft7T
ft8T
la7T
la8T
fbis7L
fbis8L
ft7L
ft8L
la7L
la8L
prior
0.3
0.28
0.26
0.24
0.22
0.2
0.18
0.16
0.14
0.12
0.1
0 2000 4000 6000 8000 10000
noisicerp
Precision of Dirichlet Prior (Large Collections)
0.8
0.7
0.6
0.5
0.4
trec7T
trec8T
web8T
t t r r e e c c 7 8 L L 0.3
web8L
0 2000 4000 6000 8000 10000
prior
llacer
Recall of Dirichlet Prior (Large Collections)
trec7T
trec8T
web8T
trec7L trec8L
web8L
prior
Figure 3: Performance of Dirichlet smoothing.
6. COMPARISONOFMETHODS SincetheTrec7&8databasediffersfromthecombinedset
Tocomparethethreesmoothingmethods,weselectabest of FT, FBIS,LAbyonly theFederalRegister database, we
run(intermsofnon-interpolatedaverageprecision)foreach canalsocomparetheperformanceofamethodonthethree
method on each testing collection and compare the non- smaller databases with that on the large one. We find that
interpolated average precision, precision at 10 documents, thenon-interpolatedaverageprecisiononthelargedatabase
and precision at 20 documents of the selected runs. The is generally much worse than that on the smaller ones, and
resultsareshowninTable3forbothtitlesandlongqueries. is often similar to the worst one among all the three small
For title queries, there seems to be a clear order among databases. However, the precision at 10 (or 20) documents
the three methods in terms of all three precision measures: on large collections is all significantly better than that on
Dirichlet prior is betterthan absolute discounting, which is small collections. This is not surprising, since a given pre-
better than Jelinek-Mercer. Indeed, Dirichlet prior has the cision at a cutoff point of 10 documents would correspond
best average precision in all cases but one. In particular, to a much lower level of recall for a large collection than
it performed extremely well on the Web collection, signifi- for a small collection. This is exactly the same reason as
cantly better than the other two. The good performance is why one can expect a higher precision at 10 documents
relatively insensitive to the choice of µ. Indeed, many non- whenaqueryhasmanymorerelevantdocuments. Forboth
optimal Dirichlet runsare also significantly betterthan the title queries and long queries, the relative performance of
optimal runsfor Jelinek-Mercer and absolute discounting. each method tends to remain the same when we merge the
For long queries, there is also a partial order. On av- databases. Interestingly, that the optimal setting for the
erage, Jelinek-Mercer is better than Dirichlet and absolute smoothing parameters seems to stay within a similar range
discounting by all three precision measures, though its av- when databases are merged.
erageprecisionisalmostidenticaltothatofDirichlet. Both The strong correlation between the effect of smoothing
Jelinek-Mercer and Dirichlet clearly have a better average and thetypeof queries is somehow unexpected. If the pur-
precision than absolute discounting. pose of smoothing is only to improve the accuracy in es-
When comparing each method’s performance on differ- timating a unigram language model based on a document,
ent types of queries, we see that the three methods all per- then,theeffectofsmoothingshouldbemoreaffectedbythe
form better on long queries than on title queries (except characteristics of documents and the collection, and should
that Dirichlet prior performs worse on long queries than ti- be relatively insensitive to the type of queries. But the re-
tle queries on the web collection), but the increase of per- sults above suggest that this is not the case. One possible
formance is most significant for Jelinek-Mercer. Indeed, explanation is that smoothing actually plays two different
Jelinek-Mercer is the worst for title queries, but the best rolesinthequerylikelihoodretrievalmethod. Oneroleisto
for long queries. It appears that Jelinek-Mercer is much improve theaccuracy of theestimated documentslanguage
more effectivewhen queriesare more verbose. model, and can be referred to as the estimation role. The
348
ACM SIGIR Forum 273 Vol. 51 No. 2, July 2017

|     |     |     | Precision of Absolute Discounting (Small Collections) |     |     |     |     |     | Recall of Absolute Discounting (Small Collections) |     |     |     |     |     |
| --- | --- | --- | ----------------------------------------------------- | --- | --- | --- | --- | --- | -------------------------------------------------- | --- | --- | --- | --- | --- |
0.4
0.8
0.35
|     | 0.3 |     |     |     |     |     |     | 0.7 |     |     |     |     |     |     |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
noisicerp
|     | 0.25 |     |                                                       |     |     |               |     | llacer 0.6 |                                                    |       |     |     |     |               |
| --- | ---- | --- | ----------------------------------------------------- | --- | --- | ------------- | --- | ---------- | -------------------------------------------------- | ----- | --- | --- | --- | ------------- |
|     |      |     |                                                       |     |     | fbis8T fbis7T |     |            |                                                    |       |     |     |     | fbis8T fbis7T |
|     | 0.2  |     |                                                       |     |     | ft7T          |     |            |                                                    |       |     |     |     | ft7T          |
|     |      |     |                                                       |     |     | ft8T          |     | 0.5        |                                                    |       |     |     |     | ft8T          |
|     |      |     |                                                       |     |     | la7T la8T     |     |            |                                                    |       |     |     |     | la7T la8T     |
|     |      |     |                                                       |     |     | fbis7L        |     |            |                                                    |       |     |     |     | fbis7L        |
|     | 0.15 |     |                                                       |     |     | fbis8L        |     |            |                                                    |       |     |     |     | fbis8L        |
|     |      |     |                                                       |     |     | ft7L ft8L     |     | 0.4        |                                                    |       |     |     |     | ft7L ft8L     |
|     |      |     |                                                       |     |     | la7L          |     |            |                                                    |       |     |     |     | la7L          |
|     |      |     |                                                       |     |     | la8L          |     |            |                                                    |       |     |     |     | la8L          |
|     | 0.1  | 0   | 0.2 0.4                                               | 0.6 | 0.8 | 1             |     | 0          | 0.2                                                | 0.4   | 0.6 | 0.8 | 1   |               |
|     |      |     | delta                                                 |     |     |               |     |            |                                                    | delta |     |     |     |               |
|     |      |     | Precision of Absolute Discounting (Large Collections) |     |     |               |     |            | Recall of Absolute Discounting (Large Collections) |       |     |     |     |               |
|     | 0.3  |     |                                                       |     |     |               |     | 0.8        |                                                    |       |     |     |     |               |
0.28
|     | 0.26 |     |     |     |     |     |     | 0.7 |     |     |     |     |     |     |
| --- | ---- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
0.24
|     | 0.22      |     |     |     |     |     |     | 0.6    |     |     |     |     |     |     |
| --- | --------- | --- | --- | --- | --- | --- | --- | ------ | --- | --- | --- | --- | --- | --- |
|     | noisicerp |     |     |     |     |     |     | llacer |     |     |     |     |     |     |
0.2
|     | 0.18 |     |     |     |     |     |     | 0.5 |     |     |     |     |     |     |
| --- | ---- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
0.16
|     | 0.14 |     |         |        |     | trec8T trec7T |     | 0.4         |              |       |     |     |     | trec8T trec7T |
| --- | ---- | --- | ------- | ------ | --- | ------------- | --- | ----------- | ------------ | ----- | --- | --- | --- | ------------- |
|     |      |     |         |        |     | web8T         |     |             |              |       |     |     |     | web8T         |
|     | 0.12 |     |         |        |     | trec7L        |     |             |              |       |     |     |     | trec7L        |
|     |      |     |         |        |     | web8L trec8L  |     |             |              |       |     |     |     | web8L trec8L  |
|     | 0.1  |     |         |        |     |               |     | 0.3         |              |       |     |     |     |               |
|     |      | 0   | 0.2 0.4 | 0.6    | 0.8 | 1             |     | 0           | 0.2          | 0.4   | 0.6 | 0.8 | 1   |               |
|     |      |     | delta   |        |     |               |     |             |              | delta |     |     |     |               |
|     |      |     |         | Figure | 4:  | Performance   |     | of absolute | discounting. |       |     |     |     |               |
otheristo“explain”thecommonandnon-informativewords extra countsare shared byboth theseen words and unseen
inaquery,andcanbereferredtoastheroleofquerymodel- words. One problem of this approach is that a high count
ing. Indeed,this second role is explicitly implemented with word may actually end up with more than its actual count
atwo-stateHMMin[10]. Thisroleisalsowell-supportedby in the document, if it is frequent in the fallback model. An
the connection of smoothing and IDF weighting derived in alternative smoothing strategy is “backoff.” Here the main
Section 2. Intuitively, more smoothing would decrease the idea is to trust the maximum likelihood estimate for high
“discrimination power” of common words in the query, be- count words, and to discount and redistribute mass only
causealldocumentswillrelymoreonthecollectionlanguage for the less common terms. As a result, it differs from the
model togenerate thecommon words. interpolationstrategyinthattheextracountsareprimarily
The effect of smoothing that we observed is generally used for unseen words. The Katz smoothing method is a
a mixed effect of both roles of smoothing. But, for title well-knownbackoffmethod[7]. Thebackoffstrategyisvery
queries,theeffectismoredominatedbytheestimationrole, popular in speech recognition tasks.
since in our experiments the title queries have few or no Following [2], weimplementedabackoff version ofall the
non-informative common words, whereas for long queries, three interpolation-based methods, which is derived as fol-
the effect is more influenced by the role of query modeling lows. Recall that in all three methods, p s(w) is written as
for they often have many non-informative common words. thesumoftwoparts: (1)adiscountedmaximumlikelihood
Thus,thefactthattheDirichletpriormethodperformsthe estimate, which we denote by p (w); (2) a collection lan-
dml
best on title queries suggests that it is good for the esti- guage model term, i.e., α p(w|C). If we use only the first
d
mation role, and the fact that Jelinek-Mercer performs the term for ps(w) and renormalize the probabilities, we will
worstfortitlequeries,butthebestforlongqueriessuggests havea smoothing method that follows the backoff strategy.
that Jelinek-Mercer is good for the role of query modeling. Itisnothardtoshowthatifaninterpolation-basedsmooth-
Intuitively this also makes sense, as Dirichlet prior adapts ingmethodischaracterizedbyp s(w)=p dml (w)+α d p(w|C)
to thelength of documents naturally, which is desirable for andpu(w)=α d p(w|C),thenthebackoffversionisgivenby
|     |     |     |     |     |     |     |     | ′   |     |     | ′   |     |     |     |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
the estimation role, while in Jelinek-Mercer, we set a fixed p (w) = p (w) and p (w) = αdp(w|C) . The
|           |     |           |            |            |       |           |     | s    | dml           |         | u   | 1− i:c(wi;d)>0p(wi|C) |     |            |
| --------- | --- | --------- | ---------- | ---------- | ----- | --------- | --- | ---- | ------------- | ------- | --- | --------------------- | --- | ---------- |
| smoothing |     | parameter | across all | documents, | which | is neces- |     |      |               |         |     | P                     |     |            |
|           |     |           |            |            |       |           |     | form | of theranking | formula | and | the smoothing         |     | parameters |
sary for querymodeling.
|     |     |     |     |     |     |     |     | remain | the same. | It is | easy to | see that | the α | in the back- |
| --- | --- | --- | --- | --- | --- | --- | --- | ------ | --------- | ----- | ------- | -------- | ----- | ------------ |
d
|     |     |     |     |     |     |     |     | off version | differs | from | that in | the interpolation |     | version by |
| --- | --- | --- | --- | --- | --- | --- | --- | ----------- | ------- | ---- | ------- | ----------------- | --- | ---------- |
7. INTERPOLATIONVS. BACKOFF a document-dependent term which further penalizes long
|     |           |             |                                 |                |            |            |     | documents. | The      | weight        | of a      | matched  | term   | due to backoff |
| --- | --------- | ----------- | ------------------------------- | -------------- | ---------- | ---------- | --- | ---------- | -------- | ------------- | --------- | -------- | ------ | -------------- |
|     | The three | methods     | that we                         | have described |            | and tested | so  |            |          |               |           |          |        |                |
|     |           |             |                                 |                |            |            |     | smoothing  | has      | a much        | wider     | range of | values | ((−∞,+∞))      |
| far | belong    | to the      | category of interpolation-based |                |            | methods,   |     |            |          |               |           |          |        |                |
|     |           |             |                                 |                |            |            |     | than       | that for | interpolation | ((0,+∞)). |          | Thus,  | analytically,  |
| in  | which     | we discount | the counts                      | of the         | seen words | and        | the |            |          |               |           |          |        |                |
349
|     | ACM | SIGIR | Forum |     |     |     | 274 |     |     |     | Vol. | 51  | No. 2, | July 2017 |
| --- | --- | ----- | ----- | --- | --- | --- | --- | --- | --- | --- | ---- | --- | ------ | --------- |

|     |     | Collection |                        | Jelinek-Mercer |     |     |                        | DirichletPrior | AbsoluteDiscounting    |     |     |     |     |
| --- | --- | ---------- | ---------------------- | -------------- | --- | --- | ---------------------- | -------------- | ---------------------- | --- | --- | --- | --- |
|     |     |            | avgpr,pr@10d,pr@20d(λ) |                |     |     | avgpr,pr@10d,pr@20d(µ) |                | avgpr,pr@10d,pr@20d(δ) |     |     |     |     |
fbis7T 0.172,0.284,0.220(0.05) 0.197,0.282,0.238(2000) 0.177,0.284,0.233(0.8)
ft7T 0.199,0.263,0.195(0.5) 0.236,0.283,0.213(4000) 0.215,0.271,0.196(0.8)
la7T 0.179,0.238,0.205(0.4) 0.220,0.294,0.233(2000) 0.194,0.268,0.216(0.8)
fbis8T 0.306,0.344,0.282(0.01) 0.334,0.367,0.292(500) 0.319,0.363,0.288(0.5)
|     |     |     |     | 0.310,0.359,0.283(0.3) |     |     | 0.324,0.367,0.297(800) |     | 0.326,0.367,0.296(0.7) |     |     |     |     |
| --- | --- | --- | --- | ---------------------- | --- | --- | ---------------------- | --- | ---------------------- | --- | --- | --- | --- |
ft8T
la8T 0.231,0.264,0.211(0.2) 0.258,0.271,0.216(500) 0.238,0.282,0.224(0.8)
trec7T 0.167,0.366,0.315(0.3) 0.186,0.412,0.342(2000) 0.172,0.382,0.333(0.7)
trec8T 0.239,0.438,0.378(0.2) 0.256,0.448,0.398(800) 0.245,0.466,0.406(0.6)
web8T 0.243,0.348,0.293(0.01) 0.294,0.448,0.374(3000) 0.242,0.370,0.323(0.7)
|     |     | Avg.       |                        |                   |     |     | 0.256,0.352,0.289      |                |                        |     |     |     |     |
| --- | --- | ---------- | ---------------------- | ----------------- | --- | --- | ---------------------- | -------------- | ---------------------- | --- | --- | --- | --- |
|     |     |            |                        | 0.227,0.323,0.265 |     |     |                        |                | 0.236,0.339,0.279      |     |     |     |     |
|     |     | Collection |                        | Jelinek-Mercer    |     |     |                        | DirichletPrior | AbsoluteDiscounting    |     |     |     |     |
|     |     |            | avgpr,pr@10d,pr@20d(λ) |                   |     |     | avgpr,pr@10d,pr@20d(µ) |                | avgpr,pr@10d,pr@20d(δ) |     |     |     |     |
fbis7L 0.224,0.339,0.279(0.7) 0.232,0.313,0.249(5000) 0.185,0.321,0.259(0.6)
ft7L 0.279,0.331,0.244(0.7) 0.281,0.329,0.248(2000) 0.249,0.317,0.236(0.8)
la7L 0.264,0.350,0.286(0.7) 0.265,0.354,0.285(2000) 0.251,0.340,0.279(0.7)
fbis8L 0.341,0.349,0.283(0.5) 0.347,0.349,0.290(2000) 0.343,0.356,0.274(0.7)
|     |     |      | 0.375,0.427,0.320(0.8) |     |     |     |                         |     | 0.351,0.398,0.309(0.8) |     |     |     |     |
| --- | --- | ---- | ---------------------- | --- | --- | --- | ----------------------- | --- | ---------------------- | --- | --- | --- | --- |
|     |     | ft8L |                        |     |     |     | 0.347,0.380,0.297(2000) |     |                        |     |     |     |     |
la8L 0.290,0.296,0.238(0.7) 0.277,0.282,0.231(500) 0.267,0.287,0.222(0.6)
trec7L 0.222,0.476,0.401(0.8) 0.224,0.456,0.383(3000) 0.204,0.460,0.396(0.7)
trec8L 0.265,0.504,0.434(0.8) 0.260,0.484,0.4(2000) 0.248,0.518,0.428(0.8)
web8L 0.259,0.422,0.348(0.5) 0.275,0.410,0.343(10000) 0.253,0.414,0.333(0.6)
|     |     | Avg. |     | 0.280,0.388,0.315 |     |     |                   |     |                   |     |     |     |     |
| --- | --- | ---- | --- | ----------------- | --- | --- | ----------------- | --- | ----------------- | --- | --- | --- | --- |
|     |     |      |     |                   |     |     | 0.279,0.373,0.303 |     | 0.261,0.379,0.304 |     |     |     |     |
Table 3: Comparison of smoothing methods on title queries (top) and long queries (bottom). The three
numbers in each cell are average precision, precision at 10 documents, and precision at 20 documents. The
parameter chosen for each data set and method is shown in parentheses.
Precision of Interpolation vs. Backoff (Jelinek-Mercer) Precision of Interpolation vs. Backoff (Dirichlet prior) Precision of Interpolation vs. Backoff (Absolute Discounting)
|           | 0.4       |     |     |     |           | 0.4  |     |           | 0.4       |     |     |           |        |
| --------- | --------- | --- | --- | --- | --------- | ---- | --- | --------- | --------- | --- | --- | --------- | ------ |
| 0.35      |           |     |     |     |           | 0.35 |     |           | 0.35      |     |     |           |        |
|           | 0.3       |     |     |     |           | 0.3  |     |           | 0.3       |     |     |           |        |
| 0.25      |           |     |     |     |           | 0.25 |     |           | 0.25      |     |     |           |        |
| noisicerp |           |     |     |     | noisicerp |      |     |           | noisicerp |     |     |           |        |
|           | 0.2       |     |     |     |           | 0.2  |     |           | 0.2       |     |     |           |        |
| 0.15      |           |     |     |     |           | 0.15 |     |           | 0.15      |     |     |           |        |
|           | 0.1       |     |     |     |           | 0.1  |     |           | 0.1       |     |     |           |        |
|           | fbis8T    |     |     |     |           |      |     | fbis8T    |           |     |     |           | fbis8T |
|           | fbis8T-bk |     |     |     |           |      |     | fbis8T-bk |           |     |     | fbis8T-bk |        |
| 0.05      | fbis8L    |     |     |     |           | 0.05 |     | fbis8L    | 0.05      |     |     |           | fbis8L |
|           | fbis8L-bk |     |     |     |           |      |     | fbis8L-bk |           |     |     | fbis8L-bk |        |
|           | 0         |     |     |     |           | 0    |     |           | 0         |     |     |           |        |
0 0.2 0.4 0.6 0.8 1 0 500 100015002000250030003500400045005000 0 0.2 0.4 0.6 0.8 1
|     |     | lambda |     |     |     |     |     | prior |     |     |     | delta |     |
| --- | --- | ------ | --- | --- | --- | --- | --- | ----- | --- | --- | --- | ----- | --- |
Figure 5: Interpolation versus backoff for Jelinek-Mercer (top), Dirichlet smoothing (middle), and absolute
| discounting |     | (bottom). |     |     |     |     |     |     |     |     |     |     |     |
| ----------- | --- | --------- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
the backoff version tends to do term weighting and docu- 8. CONCLUSIONS AND FUTURE WORK
| ment       | length | normalization | more     | aggressively |     | than | the cor- |                    |                |     |             |       |              |
| ---------- | ------ | ------------- | -------- | ------------ | --- | ---- | -------- | ------------------ | -------------- | --- | ----------- | ----- | ------------ |
|            |        |               |          |              |     |      |          | Wehavestudied      | theproblem     |     | of language | model | smooth-      |
| responding |        | interpolated  | version. |              |     |      |          |                    |                |     |             |       |              |
|            |        |               |          |              |     |      |          | ing in the context | of information |     | retrieval.  |       | By rewriting |
The backoff strategy and the interpolation strategy are the query-likelihood retrieval model using a smoothed doc-
compared for all three methods using the FBIS database ument language model, we derived a general retrieval for-
and topics401-450 (i.e., fbis8T and fbis8L). Theresultsare mulawherethesmoothingofthedocumentlanguagemodel
shown in Figure 5. Wefind that thebackoff performance is can be interpreted in terms of several heuristics used in
more sensitive to the smoothing parameter than that of in- traditional models, including TF-IDF weighting and docu-
terpolation,especiallyinJelinek-MercerandDirichletprior. ment length normalization. We then examined three popu-
| The      | difference | is clearly        | less     | significant | in the    | absolute  | dis-    |                         |           |              |         |                 |         |
| -------- | ---------- | ----------------- | -------- | ----------- | --------- | --------- | ------- | ----------------------- | --------- | ------------ | ------- | --------------- | ------- |
|          |            |                   |          |             |           |           |         | lar interpolation-based | smoothing |              | methods | (Jelinek-Mercer |         |
| counting | method,    | and               | this may | be          | due to    | its lower | upper   |                         |           |              |         |                 |         |
|          |            |                   |          |             |           |           |         | method, Dirichlet       | priors,   | and absolute |         | discounting),   | as well |
| bound    | (| d |u    | ) for theoriginal |          | α , which   | restricts | the       | aggres- |                         |           |              |         |                 |         |
d as their backoff versions, and evaluated them using several
|     | | d | |   |     |     |     |     |     |     |     |     |     |     |     |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
sivenessinpenalizinglongdocuments. Ingeneral,theback- large and small TRECretrieval testingcollections. Wefind
off strategy gives worse performance than the interpolation that the retrieval performance is generally sensitive to the
strategy,andonlycomesclosetoitwhenα approacheszero, smoothing parameters, suggesting that an understanding
d
whichisexpected,sinceanalytically,weknowthatwhenα andappropriatesettingofsmoothingparametersisveryim-
d
approaches zero, the difference between the two strategies portant in the language modeling approach. An interesting
will diminish. observationisthattheeffectofsmoothingisstronglycorre-
|     |     |     |     |     |     |     |     | latedwiththetypeofqueries. |     |     | Theperformanceisgenerally |     |     |
| --- | --- | --- | --- | --- | --- | --- | --- | -------------------------- | --- | --- | ------------------------- | --- | --- |
350
|     | ACM | SIGIR Forum |     |     |     |     |     | 275 |     | Vol. | 51  | No. 2, July | 2017 |
| --- | --- | ----------- | --- | --- | --- | --- | --- | --- | --- | ---- | --- | ----------- | ---- |

more sensitive to smoothing for long and verbose queries REFERENCES
| than for | concisetitle |     | queries. | This suggests |     | that smoothing |     |               |     |     |          |                      |     |           |     |
| -------- | ------------ | --- | -------- | ------------- | --- | -------------- | --- | ------------- | --- | --- | -------- | -------------------- | --- | --------- | --- |
|          |              |     |          |               |     |                |     | [1] A. Berger | and | J.  | Lafferty | (1999). “Information |     | retrieval | as  |
may be playing two different roles in the query likelihood statisticaltranslation,”InProceedingsofthe1999ACMSI-
retrievalmethod. Oneroleistoimprovetheaccuracyofthe GIRConferenceonResearchandDevelopmentinInforma-
tionRetrieval,pp.222–229.
| estimated | document |     | language | model, | while | the other | is to |     |     |     |     |     |     |     |     |
| --------- | -------- | --- | -------- | ------ | ----- | --------- | ----- | --- | --- | --- | --- | --- | --- | --- | --- |
accommodategenerationofnon-informativecommonwords [2] S. F. Chen and J. Goodman (1998). “An empirical study
ofsmoothingtechniquesforlanguagemodeling,”Tech.Rep.
| inthequery. | TheresultsfurthersuggestthatDirichletprior |     |     |     |     |     |     |     |     |     |     |     |     |     |     |
| ----------- | ------------------------------------------ | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
TR-10-98,HarvardUniversity.
| may be     | good | for the | estimation    | role, | while | Jelinek-Mercer |     |              |              |                |                                 |        |     |             |     |
| ---------- | ---- | ------- | ------------- | ----- | ----- | -------------- | --- | ------------ | ------------ | -------------- | ------------------------------- | ------ | --- | ----------- | --- |
|            |      |         |               |       |       |                |     | [3] N.       | Fuhr (1992). | “Probabilistic |                                 | models | in  | information | re- |
| may begood | for  | the     | querymodeling |       | role. |                |     |              |              |                |                                 |        |     |             |     |
|            |      |         |               |       |       |                |     | trieval”,The |              | Computer       | Journal,Vol.35,No.3,pp.243–255. |        |     |             |     |
Whileourresultsarenotcompletelyconclusiveastowhich
|     |     |     |     |     |     |     |     | [4] I. J. | Good | (1953). | “The Population |     | Frequencies | of  | Species |
| --- | --- | --- | --- | --- | --- | --- | --- | --------- | ---- | ------- | --------------- | --- | ----------- | --- | ------- |
smoothing method is the best, we have made several in- andtheEstimationofPopulationParameters,”Biometrika,
teresting observations that help us understand each of the Volume40,parts3,4,pp.237–264.
methods better. The Jelinek-Mercer method generally per- [5] D.HiemstraandW.Kraaij(1998). “Twenty-oneatTREC-
|     |     |     |     |     |     |     |     | 7: Ad-hoc |     | and cross-language |     | track,” | in Proc. | of  | Seventh |
| --- | --- | --- | --- | --- | --- | --- | --- | --------- | --- | ------------------ | --- | ------- | -------- | --- | ------- |
formswell,buttendstoperformmuchbetterforlongqueries TextREtrieval Conference (TREC-7),Gaithersburg,MD.
| than for | title queries. |     | The optimal |     | value | of λ has | a strong |                |     |        |        |                       |     |            |     |
| -------- | -------------- | --- | ----------- | --- | ----- | -------- | -------- | -------------- | --- | ------ | ------ | --------------------- | --- | ---------- | --- |
|          |                |     |             |     |       |          |          | [6] F. Jelinek |     | and R. | Mercer | (1980). “Interpolated |     | estimation |     |
correlation with the query type. For concise title queries, ofMarkovsourceparametersfromsparsedata”. InPattern
theoptimalvalueisgenerallyverysmall(around0.1),while RecognitioninPractice,E.S.GelsemaandL.N.Kanal(ed-
for long verbose queries, the optimal value is much larger itors),pages 381–402. NorthHolland,Amsterdam.
(around 0.7). The Dirichlet prior method generally per- [7] S.M.Katz(1987). “Estimationofprobabilitiesfromsparse
|               |           |       |              |        |          |             |         | data                        | for the | language            | model | component    | of             | a speech   | recog- |
| ------------- | --------- | ----- | ------------ | ------ | -------- | ----------- | ------- | --------------------------- | ------- | ------------------- | ----- | ------------ | -------------- | ---------- | ------ |
| forms well,   | but       | tends | to perform   | much   | better   | for         | concise |                             |         |                     |       |              |                |            |        |
|               |           |       |              |        |          |             |         | nizer,”IEEETransactions     |         |                     |       | onAcoustics, | Speech         | andSignal  |        |
| title queries | than      | for   | long verbose |        | queries. | The         | optimal |                             |         |                     |       |              |                |            |        |
|               |           |       |              |        |          |             |         | Processing,                 |         | volumeASSP-35,pages |       |              | 400–401,       | March1987. |        |
| value of      | µ appears | to    | have         | a wide | range    | (500-10000) | and     |                             |         |                     |       |              |                |            |        |
|               |           |       |              |        |          |             |         | [8] R.KneserandH.Ney(1995). |         |                     |       | “Improved    | smoothingform- |            |        |
usually is around 2,000. A large value is “safer,” especially gram language modeling,” in Proceedings of the Interna-
for long verbose queries. The absolute discounting method tionalConference onAcoustics, Speech andSignalProcess-
ing,Detroit,MI.
| performs | well | on concise | title | queries, | but | not very | well on |             |     |           |     |            |              |           |     |
| -------- | ---- | ---------- | ----- | -------- | --- | -------- | ------- | ----------- | --- | --------- | --- | ---------- | ------------ | --------- | --- |
|          |      |            |       |          |     |          |         | [9] MacKay, | D.  | and Peto, | L.  | (1995). “A | hierarchical | Dirichlet |     |
long verbose queries. Interestingly, there is little variation language model.” Natural Language Engineering, 1(3), pp.
| intheoptimalvalueforδ |     |     | (generallyaround0.7inallcases). |     |     |     |     | 289–307. |     |     |     |     |     |     |     |
| --------------------- | --- | --- | ------------------------------- | --- | --- | --- | --- | -------- | --- | --- | --- | --- | --- | --- | --- |
Considering the role of query modeling that smoothing is [10] D. H. Miller, T. Leek, and R. Schwartz (1999). “A hidden
playing, we believe that the optimal setting of smoothing Markovmodelinformationretrievalsystem,”InProceedings
parametersmayalsobesensitivetotheapplication ofstop- of the 1999 ACM SIGIR Conference on Research and De-
|     |     |     |     |     |     |     |     | velopment |     | inInformation |     | Retrieval,pp.214–221. |     |     |     |
| --- | --- | --- | --- | --- | --- | --- | --- | --------- | --- | ------------- | --- | --------------------- | --- | --- | --- |
word list.
|                       |     |     |          |     |              |            |     | [11] H. Ney, | U.  | Essen, | and R. | Kneser (1994). |     | “On structuring |     |
| --------------------- | --- | --- | -------- | --- | ------------ | ---------- | --- | ------------ | --- | ------ | ------ | -------------- | --- | --------------- | --- |
| Whileusedsuccessfully |     |     | inspeech |     | recognition, | thebackoff |     |              |     |        |        |                |     |                 |     |
probabilisticdependenciesinstochasticlanguagemodeling,”
| strategy         | did not | work     | well    | for retrieval | in  | our evaluation. |      |                     |        |     |                      |          |          |             |     |
| ---------------- | ------- | -------- | ------- | ------------- | --- | --------------- | ---- | ------------------- | ------ | --- | -------------------- | -------- | -------- | ----------- | --- |
|                  |         |          |         |               |     |                 |      | Computer            | Speech |     | and Language,8:1-38. |          |          |             |     |
| All interpolated |         | versions | perform | significantly |     | better          | than |                     |        |     |                      |          |          |             |     |
|                  |         |          |         |               |     |                 |      | [12] J.Ponte(1998). |        | A   | language             | modeling | approach | to informa- |     |
their backoff version. tion retrieval. Ph.D. thesis, University of Massachusetts at
Amherst.
| There | are several |     | interesting | future | research | directions |     |     |     |     |     |     |     |     |     |
| ----- | ----------- | --- | ----------- | ------ | -------- | ---------- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
[13] J.PonteandW.B.Croft(1998).“Alanguagemodelingap-
| thatwillhelpbetterunderstandtheroleofsmoothing. |     |     |     |     |     |     | First, |        |                |     |             |             |     |        |     |
| ----------------------------------------------- | --- | --- | --- | --- | --- | --- | ------ | ------ | -------------- | --- | ----------- | ----------- | --- | ------ | --- |
|                                                 |     |     |     |     |     |     |        | proach | to information |     | retrieval,” | Proceedings |     | of the | ACM |
it would be interesting to test with queries that are long, SIGIR,pp.275–281.
| but non-verbose, |     | or short | but | verbose. | This | will help | clar- |            |                |     |         |                  |     |       |         |
| ---------------- | --- | -------- | --- | -------- | ---- | --------- | ----- | ---------- | -------------- | --- | ------- | ---------------- | --- | ----- | ------- |
|                  |     |          |     |          |      |           |       | [14] C. J. | van Rijsbergen |     | (1986). | “A Non-classical |     | Logic | for In- |
ify whether it is the length or the verbosity of the query formationRetrieval,”The Computer Journal, 29(6).
| that is | interacting | with | the | effect | of smoothing. |     | Second, |            |            |     |                       |     |     |       |        |
| ------- | ----------- | ---- | --- | ------ | ------------- | --- | ------- | ---------- | ---------- | --- | --------------------- | --- | --- | ----- | ------ |
|         |             |      |     |        |               |     |         | [15] S. E. | Robertson, |     | C. J. van-Rijsbergen, |     | and | M. F. | Porter |
one can de-couple the two different roles of smoothing by (1981).“Probabilisticmodelsofindexingandsearching”,in
adopting a two stage smoothing strategy in which Dirich- Oddy R. N. et al. (Eds.) Information Retrieval Research,
|               |     |          |         |              |     |                |     | Butterworths,London, |     |     | 1981,pp.35–56. |     |     |     |     |
| ------------- | --- | -------- | ------- | ------------ | --- | -------------- | --- | -------------------- | --- | --- | -------------- | --- | --- | --- | --- |
| let smoothing |     | is first | applied | to implement |     | the estimation |     |                      |     |     |                |     |     |     |     |
roleandJelinek-Mercersmoothingisthenappliedtoimple- [16] S. E. Robertson, S. Walker, S. Jones, M. M. Hancock-
Beaulieu,andM.Gatford(1995).“OkapiatTREC-3,”The
| ment the | role | of query | modeling. | Finally, |     | there are | many |       |      |           |            |                     |     |     |     |
| -------- | ---- | -------- | --------- | -------- | --- | --------- | ---- | ----- | ---- | --------- | ---------- | ------------------- | --- | --- | --- |
|          |      |          |           |          |     |           |      | Third | Text | REtrieval | Conference | (TREC-3),inD.K.Har- |     |     |     |
man(ed),NISTSpecialPublication.
| other effective |     | smoothing | algorithms |     | that | we have | not yet |     |     |     |     |     |     |     |     |
| --------------- | --- | --------- | ---------- | --- | ---- | ------- | ------- | --- | --- | --- | --- | --- | --- | --- | --- |
tested(e.g.,Good-Turingsmoothing[4],Katzsmoothing[7], [17] G.Salton and C.Buckley (1988). “Term-weighting ap-
|            |                 |            |            |                |         |                |      | proaches                         | inautomatic                   |           | textretrieval,”Information |                         |     | Process-        |     |
| ---------- | --------------- | ---------- | ---------- | -------------- | ------- | -------------- | ---- | -------------------------------- | ----------------------------- | --------- | -------------------------- | ----------------------- | --- | --------------- | --- |
| Kneser-Ney | smoothing       |            | [8]);      | evaluation     | of      | them would     | be a |                                  |                               |           |                            |                         |     |                 |     |
|            |                 |            |            |                |         |                |      | ing                              | and Management,24,pp.513–523. |           |                            |                         |     |                 |     |
| natural    | furtherresearch |            | direction. | It             | is also | very important |      |                                  |                               |           |                            |                         |     |                 |     |
|            |                 |            |            |                |         |                |      | [18] G.SaltonandC.Buckley(1990), |                               |           |                            | “Improvingretrievalper- |     |                 |     |
| to study   | how             | to exploit | the        | past relevance |         | judgments,     | the  |                                  |                               |           |                            |                         |     |                 |     |
|            |                 |            |            |                |         |                |      | formance                         | by                            | relevance | feedback”,                 | Journal                 |     | of the American |     |
currentquery,andthecurrentdatabasetotrainthesmooth- SocietyforInformationScience, Vol.44,No.4,288–297.
| ing parameters, |     | since, | in practice, | it  | would | not be | feasible |     |     |     |     |     |     |     |     |
| --------------- | --- | ------ | ------------ | --- | ----- | ------ | -------- | --- | --- | --- | --- | --- | --- | --- | --- |
[19] A.Singhal,C.Buckley,andM.Mitra(1996).“Pivoteddoc-
tosearchthewholeparameterspaceaswedidinthispaper. ument length normalization,” in Proceedings of the 1996
|     |     |     |     |     |     |     |     | ACM         | SIGIR | Conference          | on  | Research | and | Development | in  |
| --- | --- | --- | --- | --- | --- | --- | --- | ----------- | ----- | ------------------- | --- | -------- | --- | ----------- | --- |
|     |     |     |     |     |     |     |     | Information |       | Retrieval,pp.21–29. |     |          |     |             |     |
ACKNOWLEDGEMENTS [20] F. Song and B. Croft (1999). “A general language model
|     |     |     |     |     |     |     |     | forinformationretrieval,”in |            |     |             | Proceedings | of          | the 1999 | ACM    |
| --- | --- | --- | --- | --- | --- | --- | --- | --------------------------- | ---------- | --- | ----------- | ----------- | ----------- | -------- | ------ |
|     |     |     |     |     |     |     |     | SIGIR                       | Conference |     | on Research | and         | Development | in       | Infor- |
We thank Jamie Callan, Bruce Croft, John Prange, and mation Retrieval,pp.279–280.
thethreeanonymousreviewersforhelpfulcommentsonthis
|     |     |     |     |     |     |     |     | [21] K.SparckJones(1997).Readings |     |     |     | inInformation |     | Retrieval, |     |
| --- | --- | --- | --- | --- | --- | --- | --- | --------------------------------- | --- | --- | --- | ------------- | --- | ---------- | --- |
work. ThisresearchwassponsoredinpartbytheAdvanced P.Willett,ed.,MorganKaufmannPublishers.
Research and Development Activity in Information Tech- [22] S. K.M.Wong and Y.Y.Yao (1995), “Onmodelinginfor-
nology(ARDA)underitsStatisticalLanguageModelingfor mation retrieval withprobabilisticinference,” ACM Trans-
Information Retrieval Research Program. actions on Information Systems,13(1), pp.69–99.
351
| ACM | SIGIR | Forum |     |     |     |     |     | 276 |     |     | Vol. | 51  | No. 2, | July 2017 |     |
| --- | ----- | ----- | --- | --- | --- | --- | --- | --- | --- | --- | ---- | --- | ------ | --------- | --- |