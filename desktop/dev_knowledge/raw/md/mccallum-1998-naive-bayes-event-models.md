A Comparison of Event Models for Naive Bayes Text Classi(cid:12)cation
Andrew McCallumzy Kamal Nigamy
mccallum@justresearch.com knigam@cs.cmu.edu
zJust Research
4616 Henry Street ySchool of Computer Science
Pittsburgh, PA 15213 Carnegie Mellon University
Pittsburgh, PA 15213
Abstract learning, especially when the number of attributes is
large.
Recent approaches to text classi(cid:12)cation have used two Document classi(cid:12)cation is just such a domain with
di(cid:11)erent (cid:12)rst-order probabilistic models for classi(cid:12)ca-
a large number of attributes. The attributes of the
tion,both of whichmake the naiveBayesassumption.
examples to be classi(cid:12)ed are words, and the number
Some use a multi-variate Bernoulli model, that is, a
of di(cid:11)erent words can be quite large indeed. While
BayesianNetworkwithnodependenciesbetweenwords
some simple document classi(cid:12)cation tasks can be ac-
andbinary wordfeatures (e.g. Larkeyand Croft1996;
Koller and Sahami 1997). Others use a multinomial curately performed with vocabularysizes less than one
model,thatis,auni-gramlanguagemodelwithinteger hundred, many complex tasks on real-world data from
wordcounts(e.g. LewisandGale1994;Mitchell1997). theWeb,UseNetandnewswirearticlesdobestwithvo-
This paper aims to clarify the confusion by describing cabulary sizes in the thousands. Naive Bayes has been
thedi(cid:11)erences anddetailsofthesetwomodels,and by successfully applied todocument classi(cid:12)cationin many
empiricallycomparing their classi(cid:12)cation performance research e(cid:11)orts (see references below).
on (cid:12)ve text corpora. We (cid:12)nd that the multi-variate
Despite its popularity, there has been some confu-
Bernoulli performs well with small vocabulary sizes,
sion in the document classi(cid:12)cation community about
but that the multinomial performs usually performs
the \naive Bayes" classi(cid:12)er because there are two dif-
even better at larger vocabulary sizes|providing on
ferent generativemodelsincommonuse, both ofwhich
averagea27%reductioninerroroverthemulti-variate
Bernoullimodel at any vocabulary size. make the \naive Bayes assumption." Both are called
\naiveBayes" by their practitioners.
One model speci(cid:12)es that a document is represented
Introduction
by avector ofbinaryattributes indicatingwhich words
SimpleBayesianclassi(cid:12)ershavebeengainingpopularity occur and do not occur in the document. The number
lately,andhavebeenfoundtoperformsurprisinglywell of times a word occurs in a document is not captured.
(Friedman 1997; Friedman et al. 1997; Sahami 1996; When calculating the probability of a document, one
Langley et al. 1992). These probabilistic approaches multiplies the probability of all the attribute values,
make strong assumptions about how the data is gen- including the probability of non-occurrence for words
erated, and posit a probabilistic model that embodies that do not occur in the document. Here we can un-
theseassumptions; thenthey useacollectionoflabeled derstand the document to be the \event," and the ab-
training examples to estimate the parameters of the sence orpresence ofwordstobeattributes oftheevent.
generative model. Classi(cid:12)cation on new examples is This describes a distribution based on a multi-variate
performed with Bayes’ rule by selecting the class that Bernoulli event model. This approach is more tradi-
is most likely to have generated the example. tional in the (cid:12)eld of Bayesian networks, and is appro-
The naive Bayes classi(cid:12)er is the simplest of these priate for tasks that have a (cid:12)xed number of attributes.
models, in that it assumes that all attributes of the The approach has been used for text classi(cid:12)cation by
examples are independent of each other given the con- numerous people (Robertson and Sparck-Jones 1976;
text of the class. This is the so-called \naive Bayes Lewis 1992; Kalt and Croft 1996; Larkey and Croft
assumption." While this assumption is clearly false 1996; Koller and Sahami 1997;Sahami 1996).
in most real-world tasks, naive Bayes often performs The second model speci(cid:12)es that a document is rep-
classi(cid:12)cation very well. This paradox is explained by resented by the set of word occurrences from the doc-
thefactthat classi(cid:12)cationestimationisonlyafunction ument. As above, the order of the words is lost, how-
of the sign (in binary cases) of the function estima- ever, the number of occurrences of each word in the
tion;thefunctionapproximationcanstillbepoorwhile document is captured. When calculating the proba-
classi(cid:12)cation accuracy remains high (Friedman 1997; bility of a document, one multiplies the probability of
Domingos and Pazzani 1997). Because of the indepen- the words that occur. Here we can understand the in-
dence assumption, the parameters for each attribute dividual word occurrences to be the \events" and the
can be learned separately, and this greatly simpli(cid:12)es document to be the collection of word events. We call

this the multinomial event model. This approach is and mixture model components, and thus use c to in-
j
more traditional in statistical language modeling for dicate both the jth mixture component and the jth
speech recognition, where it would be called a \uni- class.1 In this setting, (supervised learning from la-
gram language model." This approach has also been beledtrainingexamples),thetypically\hidden"indica-
used for text classi(cid:12)cation by numerous people (Lewis tor variablesfor a mixture model areprovided as these
and Gale 1994; Kalt and Croft 1996; Joachims 1997; class labels.
Guthrie and Walker 1994; Li and Yamanishi 1997;
Mitchell 1997; Nigam et al. 1998; McCallum et al. Multi-variate Bernoulli Model
1998).
Inthemulti-variateBernoullieventmodel,adocument
This paper aims to clarify the confusion between
is a binary vector over the space of words. Given
these two approaches by explaining both models in a vocabulary V, each dimension of the space t, t 2
detail. We present an extensive empirical compari- f1;:::;jVjg, corresponds to word w from the vocabu-
son on (cid:12)ve corpora, including Web pages, UseNet ar- t
lary. Dimensiontofthevector fordocument d iswrit-
ticles and Reuters newswire articles. Our results indi- i
ten B , and is either 0 or 1, indicating whether word
cate that the multi-variate Bernoulli model sometimes it
w occurs at least once in the document. With such
performs better than the multinomial at small vocab- t
a document representation, we make the naive Bayes
ulary sizes. However, the multinomial usually out-
assumption: that the probability of each word occur-
performs the multi-variate Bernoulli at large vocabu-
ring in a document is independent of the occurrence of
lary sizes, and almost always beats the multi-variate
other words in a document. Then, the probability of a
Bernoulli when vocabulary size is chosen optimallyfor
document given its class fromEquation 1 is simplythe
both. Whilesometimesthedi(cid:11)erence inperformance is
product of the probability of the attribute values over
not great, on averageacross data sets, the multinomial
all word attributes:
providesa27%reductioninerroroverthemulti-variate
Bernoulli.
YjVj
Probabilistic Framework of Naive Bayes P(d jc ;(cid:18))= (B P(w jc ;(cid:18))+ (2)
i j it t j
This section presents the generative model for both t=1
cases of the naive Bayes classi(cid:12)er. First we explain (1−B )(1−P(w jc ;(cid:18)))):
it t j
the mechanisms they havein common,then, where the
eventmodelsdiverge,theassumptionsandformulations Thusgivenagenerating component,adocument can
of each are presented. beseenasacollectionofmultipleindependentBernoulli
Consider the task of text classi(cid:12)cation in a Bayesian experiments, onefor each wordin the vocabulary,with
learning framework. This approach assumes that the the probabilities for each of these word events de(cid:12)ned
text data was generated by a parametric model, and by each component, P(w t jc j ;(cid:18)). This is equivalent to
uses trainingdatatocalculateBayes-optimalestimates viewing the distribution over documents as being de-
of the model parameters. Then, equipped with these scribed by a Bayesian network, where the absence or
estimates, it classi(cid:12)es new test documents using Bayes’ presence ofeach word is dependent onlyon theclass of
rule to turn the generativemodel around and calculate the document.
theposterior probabilitythataclass wouldhavegener- Given a set of labeled training documents, D =
ated the test document inquestion. Classi(cid:12)cationthen fd 1 ;:::;djDj g, learning the parameters of a probabilis-
becomes asimplematterofselectingthemostprobable tic classi(cid:12)cation model corresponds to estimating each
class. of these class-conditional word probabilities. The pa-
Both scenarios assume that text documents are gen- rameters of a mixture component are written (cid:18) wt jcj =
e m ra ix t t e u d re by m a od m el ix c t o u n r s e is m ts od o e f l m p i a x r t a u m re ete c r o i m ze p d on b e y nt (cid:18) s . c Th 2 e P la ( t w e t B jc a j y ; e (cid:18) s ) - , op w t h im er a e l e 0 st (cid:20) ima (cid:18) t w e t s jc f j or (cid:20) the 1 s . e p W ro e ba c b a i n lit c ie a s lc b u y -
j
C =fc
1
;:::;cjCj g. Each component is parameterized by straightforward counting of events, supplemented by a
a disjoint subset of (cid:18). Thus a document, d , is created prior(Vapnik1982). WeusetheLaplaceanprior,prim-
i
by (1) selecting a component according to the priors, ingeachword’scountwithacountofonetoavoidprob-
P(c j(cid:18)), then (2) havingthe mixturecomponent gener- abilitiesofzeroorone. De(cid:12)neP(c jd )2f0;1gasgiven
j j i
ate a document according to its own parameters, with by the document’s class label. Then, we estimate the
distribution P(d jc ;(cid:18)). We can characterize the like- probability of word w in class c with:
i j t j
lihood of a document with a sum of total probability
over all mixturecomponents: P
1+ jDj B P(c jd )
XjCj (cid:18)^ wt jcj =P(w t jc j ;(cid:18))= 2+ Pi= j 1 Dj P it (c j j d ) i : (3)
P(d j(cid:18))= P(c j(cid:18))P(d jc ;(cid:18)): (1) i=1 j i
i j i j
j=1 1In a more general setting, this one-to-one correspon-
Each document has a class label. We assume that dence can beavoided (Liand Yamanishi1997; Nigametal.
there is a one-to-one correspondence between classes 1998).

The class prior parameters, (cid:18) , are set by the maxi-
mum likelihoodestimate:
cj
P
1+ jDj N P(c jd )
P jDj P(c jd ) (cid:18)^ wt jcj =P(w t jc j ;(cid:18)^ j )= jVj+ P jVj i=P1 jD it j N j P( i c jd ) :
(cid:18)^ =P(c j(cid:18)^)= i=1 j i : (4) s=1 i=1 is j i
cj j jDj (6)
The class prior parameters are calculated as before
Notethatthismodeldoes notcapturethenumberof according to Equation 4.
times each word occurs, and that it explicitly includes
thenon-occurrenceprobabilityofwordsthatdonotap- Classi(cid:12)cation
pear in the document.
Givenestimatesoftheseparameterscalculatedfromthe
training documents, classi(cid:12)cation can be performed on
Multinomial Model
test documents bycalculatingtheposterior probability
In contrast to the multi-variateBernoulli event model, of each class given the evidence of the test document,
the multinomial model captures word frequency infor- andselectingtheclass withthehighestprobability. We
mation in documents. Consider, for example, the oc- formulatethis by applyingBayes’ rule:
currence of numbers in the Reuters newswire articles;
our tokenization maps all strings of digits to a com-
P(c j(cid:18)^)P(d jc ;(cid:18)^)
mon token. Since every news article is dated, and thus P(c jd ;(cid:18)^) = j i j j : (7)
has a number, the number token in the multi-variate j i P(d j(cid:18)^)
i
Bernoullieventmodelisuninformative. However,news
Therighthandsidemaybeexpanded by(cid:12)rst substi-
articles about earnings tend to have a lot of numbers
comparedtogeneralnewsarticles. Thus,capturingfre- tuting using Equations 1 and 4. Then the expansion
of individualterms for this equation are dependent on
quencyinformationofthistokencanhelpclassi(cid:12)cation.
the event model used. Use Equations 2 and 3 for the
In the multinomialmodel, a document is an ordered
multi-variate Bernoulli event model. Use Equations 5
sequence of word events, drawn from the same vocab-
and 6 for the multinomial
ulary V. We assume that the lengths of documents
are independent of class.2 We again make a similar
Feature Selection
naive Bayes assumption: that the probability of each
word event in a document is independent of the word’s When reducing the vocabulary size, feature selection
context andpositionin thedocument. Thus, each doc- is done by selecting words that have highest average
ument d is drawn from a multinomial distribution of mutual information with the class variable (Cover and
i
words with as many independent trials as the length Thomas 1991). This method works well with text and
of d . This yields the familiar \bag of words" repre- hasbeenusedoften(YangandPederson1997;Joachims
i
sentation for documents. De(cid:12)ne N to be the count 1997; Craven et al. 1998).
it
ofthe number oftimes word w occurs indocument d . In all previous work of which we are aware, this is
t i
Then,theprobabilityofadocumentgivenitsclassfrom donebycalculatingtheaveragemutualinformationbe-
Equation 1 is simplythe multinomialdistribution: tween the (1) class of a document and (2) the absence
or presence of a word in the document, i.e. using a
documenteventmodel,themulti-variateBernoulli. We
P(d jc ;(cid:18))=P(jd j)jd j!
YjVj
P(w
t
jc
j
;(cid:18))Nit
: (5)
writeC forarandomvariableoverallclasses, andwrite
i j i i N ! W t for a random variableover the absence or presence
it
t=1 of word w in a document, where W takes on values
t t
f 2 f0;1g, and f = 0 indicates the absence of w ,
The parameters of the generative component for t t t
and f = 1 indicates the presence of w . Average mu-
each class are the probabilities for each word, writ- t t
Pten (cid:18) wt jcj = P(w t jc j ;(cid:18)), where 0 (cid:20) (cid:18) wt jcj (cid:20) 1 and t o u f a t l he in c f l o a r s m s a v t a i r o i n ab i l s e, t H he (C di ) (cid:11) , e a r n en d c t e he be e t n w tr e o e p n y t o h f e t e h n e t c ro la p s y s
t (cid:18) wt jcj =1. variable conditioned on the absence or presence of the
Again, we can calculate Bayes-optimal estimates for
word, H(CjW ) (Cover and Thomas 1991):
these parameters from a set of labeled training data. t
Here, theestimateoftheprobabilityofwordw inclass
t
c j is: I(C;W t ) = H( X C)−H(CjW t ) (8)
2Manypreviousformalizationsofthemultinomialmodel = − P(c)log(P(c))
have omitted document length. Including document length c2 X C X
is necessary because document length speci(cid:12)es the number + P(f ) P(cjf )log(P(cjf ))
of draws from the multinomial. Our the assumption that t t t
document length contains no class information is a simpli- ft 2f0;1g c2C (cid:18) (cid:19)
X X
(cid:12)cation only. In practicedocument length may be class de- P(c;f )
pendent, and a more general formalization should capture = P(c;f t )log P(c)P(f t ) ;
this. c2Cft 2f0;1g t

where P(c), P(f ) and P(c;f ) are calculated by sums are on a stoplist, the corpus has a vocabulary of size
|                                               |     | t   |     | t   |     |     |     |        |     |     |     |     |     |     |     |
| --------------------------------------------- | --- | --- | --- | --- | --- | --- | --- | ------ | --- | --- | --- | --- | --- | --- | --- |
| overalldocuments|thatisP(c)isthenumberofdocu- |     |     |     |     |     |     |     | 29964. |     |     |     |     |     |     |     |
ments with class labelc dividedby thetotalnumber of The Newsgroups data set, collected by Ken Lang,
documents; P(f ) is the number of documents contain- contains about 20,000 articles evenly divided among
t
ing one or more occurrences of word w divided by the 20 UseNet discussion groups (Joachims 1997). Many
t
total number of documents; and P(c;f ) is the number of the categories fall into confusable clusters; for ex-
t
of documents with class label c that also contain word ample, (cid:12)ve of them are comp.* discussion groups, and
w t , divided by the total number of documents. three of them discuss religion. When tokenizing this
We experimented with this method, as well as an data, we skip the UseNet headers (thereby discarding
event model that corresponds to the multinomial: cal- thesubject line);tokensareformedfromcontiguousal-
culatingthemutualinformationbetween(1)theclassof phabetic characters with no stemming. The resulting
the document from which a word occurrence is drawn, vocabulary, after removing words that occur only once
|         |          |          |     |      |          |              |     | or on a | stoplist, | has | 42191words. |     |     |     |     |
| ------- | -------- | -------- | --- | ---- | -------- | ------------ | --- | ------- | --------- | --- | ----------- | --- | --- | --- | --- |
| and (2) | a random | variable |     | over | all word | occurrences. |     |         |           |     |             |     |     |     |     |
Here the word occurrences are the events. This calcu- The WebKB data set (Craven et al. 1998) contains
lation also uses Equation 8, but calculates the values web pages gathered from university computer science
of the terms by sums over word occurrences instead of departments. The pages are divided into seven cate-
over documents|that is P(c) is the number of word gories: student, faculty,sta(cid:11),course,project, department
|             |           |     |              |     |      |       |         | andother. | Inthispaper,weusethefourmostpopulous |     |     |     |     |     |     |
| ----------- | --------- | --- | ------------ | --- | ---- | ----- | ------- | --------- | ------------------------------------ | --- | --- | --- | --- | --- | --- |
| occurrences | appearing |     | in documents |     | with | class | label c |           |                                      |     |     |     |     |     |     |
dividedbythe totalnumber ofwordoccurrences; P(f ) entity-representing categories: student, faculty, course
t
is thenumber ofoccurrences ofword w divided bythe and project, all together containing 4199 pages. We
t
total number of word occurrences; and P(c;f ) is the did not use stemming or a stoplist; we found that us-
t
number of word occurrences of word w that also ap- ing a stoplist actually hurt performance because, for
t
|         |           |      |       |       |     |         |        | example, | \my" | is the | fourth-ranked |     | word | by mutual |     |
| ------- | --------- | ---- | ----- | ----- | --- | ------- | ------ | -------- | ---- | ------ | ------------- | --- | ---- | --------- | --- |
| pear in | documents | with | class | label | c,  | divided | by the |          |      |        |               |     |      |           |     |
total number of word occurrences. information, and is an excellent indicator of a student
Our preliminary experiments comparing these two homepage. The resulting vocabulary has 23830words.
feature selection methods on the Newsgroups data set The ‘ModApte’ train/test split of the Reuters 21578
|          |                      |     |           |       |         |          |               | Distribution | 1.0      | data | set             | consists | of 12902 | Reuters     |     |
| -------- | -------------------- | --- | --------- | ----- | ------- | -------- | ------------- | ------------ | -------- | ---- | --------------- | -------- | -------- | ----------- | --- |
| with the | multinomial          |     | event     | model | showed  | little   | di(cid:11)er- |              |          |      |                 |          |          |             |     |
|          |                      |     |           |       |         |          |               | newswire     | articles | in   | 135 overlapping |          | topic    | categories. |     |
| ence in  | classi(cid:12)cation |     | accuracy. | The   | results | reported | in            |              |          |      |                 |          |          |             |     |
this paper use the feature selection event model that Following several other studies (Joachims 1998; Liere
corresponds to the event model used for classi(cid:12)cation. and Tadepalli1997)we buildbinary classi(cid:12)ers for each
|     |              |     |     |         |     |     |     | of the 10   | most      | populous | classes.      |     | We ignore | words     | on  |
| --- | ------------ | --- | --- | ------- | --- | --- | --- | ----------- | --------- | -------- | ------------- | --- | --------- | --------- | --- |
|     |              |     |     |         |     |     |     | a stoplist, | but       | do not   | use stemming. |     | The       | resulting | vo- |
|     | Experimental |     |     | Results |     |     |     |             |           |          |               |     |           |           |     |
|     |              |     |     |         |     |     |     | cabulary    | has 19371 | words.   |               |     |           |           |     |
Thissectionprovidesempiricalevidencethatthemulti-
|              |     |       |         |          |        |      |     | For all | data          | sets except |          | Reuters,   | naive | Bayes   | is per- |
| ------------ | --- | ----- | ------- | -------- | ------ | ---- | --- | ------- | ------------- | ----------- | -------- | ---------- | ----- | ------- | ------- |
| nomial event |     | model | usually | performs | better | than | the |         |               |             |          |            |       |         |         |
|              |     |       |         |          |        |      |     | formed  | with randomly |             | selected | train-test |       | splits. | The     |
multi-variate Bernoulli. The results are based on (cid:12)ve Industry Sector and Newsgroups data sets use (cid:12)ve tri-
di(cid:11)erent data sets.3 als with 20% of the data held out for testing; Yahoo
|           |               |          |              |            |        |           |       | uses (cid:12)ve | trials               | with a         | 30%      | test data, | and         | WebKB        | uses   |
| --------- | ------------- | -------- | ------------ | ---------- | ------ | --------- | ----- | --------------- | -------------------- | -------------- | -------- | ---------- | ----------- | ------------ | ------ |
| Data Sets | and           | Protocol |              |            |        |           |       |                 |                      |                |          |            |             |              |        |
|           |               |          |              |            |        |           |       | ten trials      | with                 | a 30%          | test     | data.      | Results     | are reported |        |
|           |               |          |              |            |        |           |       | as average      | classi(cid:12)cation |                | accuracy |            | across      | trials.      | In all |
| The web   | pages         | pointed  | to           | by the     | Yahoo! | ‘Science’ | hi-   |                 |                      |                |          |            |             |              |        |
|           |               |          |              |            |        |           |       | experiments     | with                 | multipletrials |          |            | graphs show | small        | er-    |
| erarchy   | were gathered |          | in July1997. |            | Theweb | pages     | are   |                 |                      |                |          |            |             |              |        |
|           |               |          |              |            |        |           |       | ror bars        | twice                | thewidth       | ofthe    | standard   | error;      | however      |        |
| divided   | into 95       | disjoint | classes      | containing |        | 13589     | pages |                 |                      |                |          |            |             |              |        |
theyareoftenhardtoseesincetheyareoftenquitenar-
| as the result |     | of coalescing |     | classes | of hierarchy-depth |     |     |          |          |         |     |              |     |      |         |
| ------------- | --- | ------------- | --- | ------- | ------------------ | --- | --- | -------- | -------- | ------- | --- | ------------ | --- | ---- | ------- |
|               |     |               |     |         |                    |     |     | row. For | Reuters, | results | on  | the Mod-Apte |     | test | set are |
greaterthantwo,andremovingthoseclasseswithfewer
than 40 documents. After tokenizing as above and re- shown as precision-recall breakeven points, a standard
|                 |                                   |     |       |      |       |            |     | information | retrieval |     | measure           | for | binary | classi(cid:12)cation. |     |
| --------------- | --------------------------------- | --- | ----- | ---- | ----- | ---------- | --- | ----------- | --------- | --- | ----------------- | --- | ------ | --------------------- | --- |
| movingstopwords |                                   | and | words | that | occur | only once, | the |             |           |     |                   |     |        |                       |     |
|                 |                                   |     |       |      |       |            |     | Recall and  | Precision |     | are de(cid:12)ned | as: |        |                       |     |
| corpus has      | avocabularysizeof44383(McCallumet |     |       |      |       |            | al. |             |           |     |                   |     |        |                       |     |
1998).
TheIndustrySectorhierarchy,madeavailablebyMar- # of correct positive predictions
|           |      |                       |     |     |     |          |     | Recall= |     |     |             |     |          |     | (9) |
| --------- | ---- | --------------------- | --- | --- | --- | -------- | --- | ------- | --- | --- | ----------- | --- | -------- | --- | --- |
|           |      |                       |     |     |     |          |     |         |     | #   | of positive |     | examples |     |     |
| ket Guide | Inc. | (www.marketguide.com) |     |     |     | consists | of  |         |     |     |             |     |          |     |     |
companyweb pagesclassi(cid:12)edinahierarchyofindustry # of correct positivepredictions
|                                   |     |     |     |        |       |              |     | Precision | =   |     |             |             |     |     | (10) |
| --------------------------------- | --- | --- | --- | ------ | ----- | ------------ | --- | --------- | --- | --- | ----------- | ----------- | --- | --- | ---- |
| sectors (McCallum                 |     | et  | al. | 1998). | There | are 6440     | web |           |     |     |             |             |     |     |      |
|                                   |     |     |     |        |       |              |     |           |     | #   | of positive | predictions |     |     |      |
| pages partitionedintothe71classes |     |     |     |        | that  | aretwolevels |     |           |     |     |             |             |     |     |      |
deep inthehierarchy. In tokenizingthedata wedo not The precision-recall breakeven point is the value at
|             |          |     |        |      |       |      |         | which precision |     | and | recall | are equal | (Joachims | 1998). |     |
| ----------- | -------- | --- | ------ | ---- | ----- | ---- | ------- | --------------- | --- | --- | ------ | --------- | --------- | ------ | --- |
| stem. After | removing |     | tokens | that | occur | only | once or |                 |     |     |        |           |           |        |     |
Results
| 3These | data | sets | are | all available |     | on the | Inter- |     |     |     |     |     |     |     |     |
| ------ | ---- | ---- | --- | ------------- | --- | ------ | ------ | --- | --- | --- | --- | --- | --- | --- | --- |
net. See http://www.cs.cmu.edu/(cid:24)textlearning and Figure 1 shows results on the Yahoo data set. The
http://www.research.att.com/(cid:24)lewis. multinomial event model reaches a maximum of 54%

|                         |     |     |     | Yahoo Science   |                         |             |        |                         |     |     | Newsgroups      |                         |             |        |
| ----------------------- | --- | --- | --- | --------------- | ----------------------- | ----------- | ------ | ----------------------- | --- | --- | --------------- | ----------------------- | ----------- | ------ |
|                         | 100 |     |     |                 |                         |             |        |                         | 100 |     |                 |                         |             |        |
|                         |     |     |     |                 |                         | Multinomial |        |                         |     |     |                 |                         | Multinomial |        |
|                         |     |     |     |                 | Multi-variate Bernoulli |             |        |                         |     |     |                 | Multi-variate Bernoulli |             |        |
|                         | 80  |     |     |                 |                         |             |        |                         | 80  |     |                 |                         |             |        |
| ycaruccA noitacifissalC |     |     |     |                 |                         |             |        | ycaruccA noitacifissalC |     |     |                 |                         |             |        |
|                         | 60  |     |     |                 |                         |             |        |                         | 60  |     |                 |                         |             |        |
|                         | 40  |     |     |                 |                         |             |        |                         | 40  |     |                 |                         |             |        |
|                         | 20  |     |     |                 |                         |             |        |                         | 20  |     |                 |                         |             |        |
|                         | 0   |     |     |                 |                         |             |        |                         | 0   |     |                 |                         |             |        |
|                         | 10  |     | 100 | 1000            |                         | 10000       | 100000 |                         | 10  | 100 |                 | 1000                    | 10000       | 100000 |
|                         |     |     |     | Vocabulary Size |                         |             |        |                         |     |     | Vocabulary Size |                         |             |        |
Figure 1: A comparison of event models for di(cid:11)erent Figure3: Acomparisonofeventmodelsfordi(cid:11)erentvo-
vocabulary sizes on the Yahoo data set. Note that the cabulary sizes on the Newsgroups data set. Here, both
multi-variate Bernoulli performs best with a small vo- datasetsperformbestatthefullvocabulary,butmulti-
cabulary and that the multinomialperforms best with nomialachieves higher accuracy.
| a larger | vocabulary. |     | The | multinomial |     | achieves | higher |     |     |     |         |     |     |     |
| -------- | ----------- | --- | --- | ----------- | --- | -------- | ------ | --- | --- | --- | ------- | --- | --- | --- |
| accuracy | overall.    |     |     |             |     |          |        |     |     |     | WebKB 4 |     |     |     |
100
Multinomial
Multi-variate Bernoulli
Industry Sector 71
|     | 100 |     |     |     |     |     |     |     | 80  |     |     |     |     |     |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
Multinomial
Multi-variate Bernoulli
ycaruccA noitacifissalC
80
60
ycaruccA noitacifissalC
60
40
40
20
|     | 20  |     |     |     |     |     |     |     | 0   |     |     |      |       |        |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | ---- | ----- | ------ |
|     |     |     |     |     |     |     |     |     | 10  | 100 |     | 1000 | 10000 | 100000 |
Vocabulary Size
|     | 0   |     |     |      |     |       |        | Figure | 4: A | comparison | of  | event models | for | di(cid:11)erent |
| --- | --- | --- | --- | ---- | --- | ----- | ------ | ------ | ---- | ---------- | --- | ------------ | --- | --------------- |
|     | 10  |     | 100 | 1000 |     | 10000 | 100000 |        |      |            |     |              |     |                 |
Vocabulary Size vocabulary sizes on the WebKB data set. Here the two
Figure 2: A comparison of event models for di(cid:11)erent event models achieve nearly equivalent accuracies, but
vocabulary sizes on the Industry Sector data set. Note the multi-variateBernoulli achieves this with a smaller
| the | same trends | as  | seen | in the | previous | (cid:12)gure. |     | vocabulary. |     |     |     |     |     |     |
| --- | ----------- | --- | ---- | ------ | -------- | ------------- | --- | ----------- | --- | --- | --- | --- | --- | --- |
accuracyatavocabularysizeof1000words. Themulti- multi-variate Bernoulli achieves 74% accuracy. Previ-
variate Bernoulli event model reaches a maximum of ous results in this domain are consistent in that best
41%accuracywithonly200words. Notethatthemulti- results were with the full vocabulary (Joachims 1997;
|                  |     |     |       |          |         |     |              | Nigametal. |     | 1998). | FortheWebKBdata,showninFig- |     |     |     |
| ---------------- | --- | --- | ----- | -------- | ------- | --- | ------------ | ---------- | --- | ------ | --------------------------- | --- | --- | --- |
| variateBernoulli |     |     | shows | its best | results | at  | a smallervo- |            |     |        |                             |     |     |     |
ure 4,themulti-variateBernoullihasmarginallyhigher
| cabulary | than     | the         | multinomial, |     | and      | that       | the multino- |          |      |                  |     |     |          |        |
| -------- | -------- | ----------- | ------------ | --- | -------- | ---------- | ------------ | -------- | ---- | ---------------- | --- | --- | -------- | ------ |
|          |          |             |              |     |          |            |              | accuracy | than | the multinomial, |     | 87% | accuracy | at 100 |
| mial     | has best | performance |              | at  | a larger | vocabulary | size.        |          |      |                  |     |     |          |        |
Thesamepatternisseen intheIndustrySectordataset, words versus 86% accuracy at 5000 words. In ongoing
displayed in Figure 2. Here, multinomialhas the high- work we are exploring the reasons that this data set
|           |          |         |          |          |                |         |               | shows       | results | di(cid:11)erent | from      | the others. |         |              |
| --------- | -------- | ------- | -------- | -------- | -------------- | ------- | ------------- | ----------- | ------- | --------------- | --------- | ----------- | ------- | ------------ |
| est       | accuracy | of 74%  | at       | 20000    | words,         | and     | multi-variate |             |         |                 |           |             |         |              |
|           |          |         |          |          |                |         | words.4       | Figures     | 5       | and 6 show      | breakeven | point       | results | for the      |
| Bernoulli |          | is best | with 46% | accuracy |                | at 1000 |               |             |         |                 |           |             |         |              |
|           |          |         |          |          |                |         |               | ten Reuters |         | categories.     | Again,    | the         | trends  | are distinc- |
| Figure    | 3        | shows   | results  | for      | the Newsgroups |         | data set.     |             |         |                 |           |             |         |              |
Here, both event models do best at the maximum vo- tive. The multi-variate Bernoulli achieves a slightly
cabularysizes. Multinomialachieves85%accuracy and higher breakeven point in one case, but on average
|                                      |       |         |      |      |          |      |              | across                           | categories, | its     | best performance |                | is 4.8           | percent- |
| ------------------------------------ | ----- | ------- | ---- | ---- | -------- | ---- | ------------ | -------------------------------- | ----------- | ------- | ---------------- | -------------- | ---------------- | -------- |
|                                      |       |         |      |      |          |      |              | agepointslessthanthemultinomial. |             |         |                  |                | Themulti-variate |          |
| 4Accuraciesarehigherherethanreported |       |         |      |      |          |      | in(McCallum  |                                  |             |         |                  |                |                  |          |
|                                      |       |         |      |      |          |      |              | Bernoulli                        | has         | a rapid | decrease         | in performance |                  | as the   |
| et al.                               | 1998) | because | here | more | training | data | was provided |                                  |             |         |                  |                |                  |          |
to this classi(cid:12)er (70% of the data used for training here, vocabulary size grows, where the multinomial perfor-
versus only 50% in the other work). mance is more even across vocabulary size. Results by

interest curacy. Since our results show that the multi-variate
100
|     |     |     |     |     | Multinomial |     | Bernoulli | handles | large | vocabularies |     | poorly, |     | the multi- |
| --- | --- | --- | --- | --- | ----------- | --- | --------- | ------- | ----- | ------------ | --- | ------- | --- | ---------- |
Multi-variate Bernoulli
|     |     |     |     |     |     |     | nomialevent |     | model | is more | appropriate |     | for | these chal- |
| --- | --- | --- | --- | --- | --- | --- | ----------- | --- | ----- | ------- | ----------- | --- | --- | ----------- |
tnioP nevekaerB llaceR/noisicerP 80
|     |     |     |     |     |     |     | lenging    | classi(cid:12)cation |               | tasks. |                 |          |               |       |
| --- | --- | --- | --- | --- | --- | --- | ---------- | -------------------- | ------------- | ------ | --------------- | -------- | ------------- | ----- |
|     |     |     |     |     |     |     | It would   | be                   | incorrect     |        | to argue        | that     | multi-variate |       |
|     | 60  |     |     |     |     |     | Bernoulli  | has                  | the advantage |        | of              | counting | evidence      | for   |
|     |     |     |     |     |     |     | words that | do                   | not occur.    |        | Multinomials    |          | implicitly    | en-   |
|     | 40  |     |     |     |     |     | code this  | information          |               | in     | the probability |          | distributions |       |
|     |     |     |     |     |     |     | of words   | for each             | class.        | For    | example,        | if       | the word      | \pro- |
fessor"isthemostlikelywordforfacultyhomepages,it
|     | 20  |     |     |      |       |        | willhavealargeprobabilityforthefacultyclass,andall |      |     |                          |     |        |      |          |
| --- | --- | --- | --- | ---- | ----- | ------ | -------------------------------------------------- | ---- | --- | ------------------------ | --- | ------ | ---- | -------- |
|     |     |     |     |      |       |        | other words                                        | will | be  | less probable.           |     | If the | word | \profes- |
|     |     | 0   |     |      |       |        | sor"doesnotthenoccur                               |      |     | inadocument,thatdocument |     |        |      |          |
|     |     | 10  | 100 | 1000 | 10000 | 100000 |                                                    |      |     |                          |     |        |      |          |
Vocabulary Size willbe less likelyto be afaculty document, because the
ship
|     | 100 |     |     |     |             |     | words in | that      | document | will      | be  | lower      | frequency | in the |
| --- | --- | --- | --- | --- | ----------- | --- | -------- | --------- | -------- | --------- | --- | ---------- | --------- | ------ |
|     |     |     |     |     | Multinomial |     | faculty  | class and | higher   | frequency |     | in others. |           |        |
Multi-variate Bernoulli
|     |     |     |     |     |     |     | Another | point | to  | consider | is  | that | the multinomial |     |
| --- | --- | --- | --- | --- | --- | --- | ------- | ----- | --- | -------- | --- | ---- | --------------- | --- |
tnioP nevekaerB llaceR/noisicerP 80
|     |     |     |     |     |     |     | event model |     | should | be a | more | accurate | classi(cid:12)er | for |
| --- | --- | --- | --- | --- | --- | --- | ----------- | --- | ------ | ---- | ---- | -------- | ---------------- | --- |
datasetsthathavealargevarianceindocumentlength.
|     | 60  |     |     |     |     |     | The multinomial |               | event               | model | naturally         |       | handles | docu-     |
| --- | --- | --- | --- | --- | --- | --- | --------------- | ------------- | ------------------- | ----- | ----------------- | ----- | ------- | --------- |
|     |     |     |     |     |     |     | ments of        | varying       | length              | by    | incorporating     |       | the     | evidence  |
|     | 40  |     |     |     |     |     | of each         | appearing     | word.               |       | The multi-variate |       |         | Bernoulli |
|     |     |     |     |     |     |     | model           | is a somewhat |                     | poor  | (cid:12)t for     | data  | with    | varying   |
|     |     |     |     |     |     |     | length,         | inthat        | it is morelikelyfor |       |                   | aword | to      | occur ina |
20
|     |     |     |     |     |     |     | long document                        |     | regardless |     | of the              | class. | Thus, | the vari- |
| --- | --- | --- | --- | --- | --- | --- | ------------------------------------ | --- | ---------- | --- | ------------------- | ------ | ----- | --------- |
|     |     |     |     |     |     |     | ance oftheclassi(cid:12)cationshould |     |            |     | belargefordocuments |        |       |           |
0
10 100 1000 10000 100000 of varying lengths. Testing this hypothesis is a topic
Vocabulary Size
|     |     |     |     |     |     |     | of future | work. | Lewis | also | discusses |     | di(cid:14)culties | with |
| --- | --- | --- | --- | --- | --- | --- | --------- | ----- | ----- | ---- | --------- | --- | ----------------- | ---- |
Figure 5: Two of the classi(cid:12)cation tasks from Reuters. document-length in the multi-variateBernoulli model.
Whenaddingnon-textfeaturestotheclassi(cid:12)er,(such
| Multinomialevent |     |     | modelsdoanaverageof4.8%points |     |     |     |     |     |     |     |     |     |     |     |
| ---------------- | --- | --- | ----------------------------- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
better. Thisdomaintendstorequiresmallervocabular- as whether or not an email message has more than
iesforbestperformance. SeeFigure6fortheremaining one recipient), such features can be included exactly
Reuters results. as the word features are when using the multi-variate
|                     |     |     |                 |     |             |             | Bernoulli       | model    | (Sahami  |       | et al. | 1998). | However,            | in      |
| ------------------- | --- | --- | --------------- | --- | ----------- | ----------- | --------------- | -------- | -------- | ----- | ------ | ------ | ------------------- | ------- |
|                     |     |     |                 |     |             |             | the multinomial |          | model    | more  | care   | must   | be taken.           | The     |
| Joachims(1998)found |     |     | performance     |     | washighest  | in this     |                 |          |          |       |        |        |                     |         |
|                     |     |     |                 |     |             |             | non-text        | features | should   | not   | be     | added  | to the              | vocabu- |
| domainwith          |     | the | full vocabulary |     | (no feature | selection). |                 |          |          |       |        |        |                     |         |
|                     |     |     |                 |     |             |             | larybecause     |          | then the | event | spaces | for    | the di(cid:11)erent | fea-    |
However, in contrast to our results, this work uses the tureswouldcompeteforthesameprobabilitymasseven
multi-variateBernoullieventmodelforfeatureselection though they are not mutually exclusive. Non-text fea-
and the multinomial for classi(cid:12)cation. In future work tures could be added as additional Bernoulli variables
we plan to investigate these feature selection methods tobeincludedinconjunctionwiththemultinomialover
| more      | closely | because | we         | note that | our results | are con- |        |      |          |       |      |       |       |           |
| --------- | ------- | ------- | ---------- | --------- | ----------- | -------- | ------ | ---- | -------- | ----- | ---- | ----- | ----- | --------- |
|           |         |         |            |           |             |          | words. | This | approach | could | also | allow | for a | weighting |
| sistently |         | higher  | than those | found     | in that     | work.    |        |      |          |       |      |       |       |           |
factorbetweenthewordfeaturesandtheotherfeatures.
|     |     |     |     |     |     |     | It is | also more | clear | in  | the multi-variate |     |     | Bernoulli |
| --- | --- | --- | --- | --- | --- | --- | ----- | --------- | ----- | --- | ----------------- | --- | --- | --------- |
Discussion
|     |     |     |     |     |     |     | model | how | to relax | the | independence |     | assumption |     |
| --- | --- | --- | --- | --- | --- | --- | ----- | --- | -------- | --- | ------------ | --- | ---------- | --- |
Foreasy classi(cid:12)cationtasks,asmallvocabularyissu(cid:14)-
|     |     |     |     |     |     |     | by adding | a   | limited | number | of  | dependencies |     | to the |
| --- | --- | --- | --- | --- | --- | --- | --------- | --- | ------- | ------ | --- | ------------ | --- | ------ |
cient for high performance. The Reuters categorization Bayesiannetwork(Sahami1996;Friedmanetal. 1997).
| tasks                   | are | examples | of these|it |              | is well-known | that in |     |     |         |     |      |     |     |     |
| ----------------------- | --- | -------- | ----------- | ------------ | ------------- | ------- | --- | --- | ------- | --- | ---- | --- | --- | --- |
| severalofthecategories, |     |          |             | highaccuracy | canbeobtained |         |     |     |         |     |      |     |     |     |
|                         |     |          |             |              |               |         |     |     | Related |     | Work |     |     |     |
withonlyahandfulofwords,sometimeseventhesingle
word that is the title of the category (Joachims 1998). Kalt and Croft (1996) previously compared the multi-
Our results are consistent with this, in that best per- nomialmodeltothe \binaryindependence model,"the
formanceis oftenachieved withsmallvocabularysizes. information retrieval terminology for our multi-variate
Many real-world classi(cid:12)cation tasks do not share this Bernoullimodel. Theirtheoreticalanalysisofthemulti-
attribute (i.e. that all documents in a category are nomial does not properly address document length as-
aboutasinglenarrowsubjectwithlimitedvocabulary), sumptions. Their experiments use a single data set
but instead, a category consists ofdiverse subject mat- with extremely small vocabularies. Also, by normal-
ters with overlapping vocabularies. In such tasks large izing document length, their event model is no longer
vocabulariesarerequired foradequateclassi(cid:12)cationac- strictly a multinomial.

Lewis (1998) discusses the history of naive Bayes ThorstenJoachims.AprobabilisticanalysisoftheRocchio
in information retrieval, and presents a theoretical algorithm with TFIDF for text categorization. In ICML-
97,1997.
| comparison | of  | the multinomial |     | and | the | multi-variate |     |     |     |     |     |     |     |     |
| ---------- | --- | --------------- | --- | --- | --- | ------------- | --- | --- | --- | --- | --- | --- | --- | --- |
Bernoulli(againcalledthebinaryindependencemodel). ThorstenJoachims.TextcategorizationwithSupportVec-
|     |     |             |     |     |     |     |     | tor Machines: | Learning  |        | with many | relevant      | features. | In  |
| --- | --- | ----------- | --- | --- | --- | --- | --- | ------------- | --------- | ------ | --------- | ------------- | --------- | --- |
|     |     | Conclusions |     |     |     |     |     | ECML-98,1998. |           |        |           |               |           |     |
|     |     |             |     |     |     |     |     | T. Kalt       | and W. B. | Croft. | A new     | probabilistic | model     | of  |
This paper has compared the theory and practice of text classi(cid:12)ca-
twodi(cid:11)erent (cid:12)rst-order probabilisticclassi(cid:12)ers, both of tion and retrieval. Technical Report IR-78, University of
which makethe \naiveBayes assumption." The multi- MassachusettsCenterforIntelligentInformationRetrieval,
1996. http://ciir.cs.umass.edu/publications/index.shtml.
| nomial model |     | is found | to  | be almost | uniformly |     | better |     |     |     |     |     |     |     |
| ------------ | --- | -------- | --- | --------- | --------- | --- | ------ | --- | --- | --- | --- | --- | --- | --- |
than the multi-variate Bernoulli model. In empirical Daphne Koller and Mehran Sahami. Hierarchically clas-
resultson(cid:12)vereal-worldcorporawe(cid:12)ndthatthemulti- sifying documents using very few words. In Proceedings
nomial model reduces error by an average of 27%, and of the Fourteenth International Conference on Machine
| sometimes    | by   | more than                | 50%. |             |     |                |         | Learning,1997.   |                    |      |                  |           |     |       |
| ------------ | ---- | ------------------------ | ---- | ----------- | --- | -------------- | ------- | ---------------- | ------------------ | ---- | ---------------- | --------- | --- | ----- |
|              |      |                          |      |             |     |                |         | Pat Langley,     | Wayne              | Iba, | and Kevin        | Thompson. | An  | anal- |
| In future    | work | we                       | will | investigate | the | role           | of doc- |                  |                    |      |                  |           |     |       |
|              |      |                          |      |             |     |                |         | ysis of Bayesian | classi(cid:12)ers. |      | In AAAI-92,1992. |           |     |       |
| ument length |      | in classi(cid:12)cation, |      | looking     |     | for correspon- |         |                  |                    |      |                  |           |     |       |
dence between variations in document length and the LeahS.Larkeyand W.BruceCroft. Combining classi(cid:12)ers
comparativeperformanceofmulti-variateBernoulliand in text categorization. In SIGIR-96,1996.
|                            |                                      |     |     |                     |     |     |     | D.LewisandW.Gale.       |     | Asequentialalgorithmfortraining |     |     |     |     |
| -------------------------- | ------------------------------------ | --- | --- | ------------------- | --- | --- | --- | ----------------------- | --- | ------------------------------- | --- | --- | --- | --- |
| multinomial.               | Wewillalsoinvestigateeventmodelsthat |     |     |                     |     |     |     |                         |     |                                 |     |     |     |     |
|                            |                                      |     |     |                     |     |     |     | text classi(cid:12)ers. | In  | SIGIR-94,1994.                  |     |     |     |     |
| normalizethewordoccurrence |                                      |     |     | countsinadocumentby |     |     |     |                         |     |                                 |     |     |     |     |
document length,and work with morecomplex models David D. Lewis. An evaluation of phrasal and clustered
that model document length explicitly on a per-class representations on a text categorization task. In SIGIR-
| basis. |     |     |     |     |     |     |     | 92,1992. |     |     |     |     |     |     |
| ------ | --- | --- | --- | --- | --- | --- | --- | -------- | --- | --- | --- | --- | --- | --- |
We also plan experiments with varying amounts of David Lewis. Naive (bayes) at forty: The independence
trainingdatabecause wehypothesizethatthatoptimal asssumption in information retrieval. In ECML’98: Tenth
vocabularysizemaychangewiththesizeofthetraining EuropeanConferenceOn MachineLearning,1998.
set. Hang Li and Kenji Yamanishi. Document classi(cid:12)cation
|     |     |     |     |     |     |     |     | using a (cid:12)nite | mixture | model. | In  | Proceedings | of  | the 35th |
| --- | --- | --- | --- | --- | --- | --- | --- | -------------------- | ------- | ------ | --- | ----------- | --- | -------- |
AnnualMeetingoftheAssociationforComputationalLin-
Acknowledgments
guistics,1997.
| We thank | Doug | Baker | for | help formatting |     | the | Reuters |     |     |     |     |     |     |     |
| -------- | ---- | ----- | --- | --------------- | --- | --- | ------- | --- | --- | --- | --- | --- | --- | --- |
RayLiereandPrasadTadepalli.Activelearningwithcom-
| data set. | We thank |     | Market | Guide, | Inc. | for permission |     |                 |                 |     |     |                  |     |     |
| --------- | -------- | --- | ------ | ------ | ---- | -------------- | --- | --------------- | --------------- | --- | --- | ---------------- | --- | --- |
|           |          |     |        |        |      |                |     | mittees fortext | categorization. |     |     | In AAAI-97,1997. |     |     |
tousetheir Industry Sector hierarchy,andMarkCraven Andrew McCallum,Ronald Rosenfeld, Tom Mitchell,and
for gathering its data from the Web. We thank Ya- AndrewNg. Improving textclasi(cid:12)cation byshrinkage ina
hoo! for permission to use their data. We thank Tom hierarchy ofclasses. In ICML-98,1998.
| Mitchell | for helpful   |     | and enlightening |      | discussions. |       | This |                |     |                  |     |                  |     |     |
| -------- | ------------- | --- | ---------------- | ---- | ------------ | ----- | ---- | -------------- | --- | ---------------- | --- | ---------------- | --- | --- |
|          |               |     |                  |      |              |       |      | TomM.Mitchell. |     | MachineLearning. |     | WCB/McGraw-Hill, |     |     |
| research | was supported |     | in               | part | by the       | Darpa | HPKB |                |     |                  |     |                  |     |     |
1997.
program under contract F30602-97-1-0215. Kamal Nigam, Andrew McCallum, Sebastian Thrun, and
|                              |     |           |            |              |                  |              |         | Tom Mitchell.                  | Learning          |                  | to classify   | text                         | from labeled     | and     |
| ---------------------------- | --- | --------- | ---------- | ------------ | ---------------- | ------------ | ------- | ------------------------------ | ----------------- | ---------------- | ------------- | ---------------------------- | ---------------- | ------- |
|                              |     |           | References |              |                  |              |         | unlabeled                      | documents.        | In               | AAAI-98,1998. |                              |                  |         |
|                              |     |           |            |              |                  |              |         | S. E. Robertson                | and               | K. Sparck-Jones. |               | Relevance                    |                  | weight- |
| ThomasM.CoverandJoyA.Thomas. |     |           |            |              | ElementsofInfor- |              |         |                                |                   |                  |               |                              |                  |         |
|                              |     |           |            |              |                  |              |         | ing of search                  | terms.            | Journal          | of            | the American                 | Society          | for     |
| mationTheory.                |     | John      | Wiley,     | 1991.        |                  |              |         |                                |                   |                  |               |                              |                  |         |
|                              |     |           |            |              |                  |              |         | InformationScience,27:129{146, |                   |                  |               | 1976.                        |                  |         |
| M. Craven,                   | D.  | DiPasquo, |            | D. Freitag,  |                  | A. McCallum, |         |                                |                   |                  |               |                              |                  |         |
|                              |     |           |            |              |                  |              |         | Mehran                         | Sahami,           | Susan            | Dumais,       | David                        | Heckerman,       | and     |
| T. Mitchell,                 | K.  | Nigam,    | and        | S. Slattery. |                  | Learning     | to ex-  |                                |                   |                  |               |                              |                  |         |
|                              |     |           |            |              |                  |              |         | EricHorvitz.                   | Abayesianapproach |                  |               | to(cid:12)lteringjunke-mail. |                  |         |
| tract symbolic               |     | knowledge | from       | the          | World            | Wide         | Web. In |                                |                   |                  |               |                              |                  |         |
|                              |     |           |            |              |                  |              |         | In AAAI-98                     | Workshop          | on               | Learning      | for                          | Text Categoriza- |         |
AAAI-98,1998.
tion,1998.
| P. Domingos          |          | and M.           | Pazzani. | On             | the optimality |       | of the  |                    |           |                                |         |            |          |     |
| -------------------- | -------- | ---------------- | -------- | -------------- | -------------- | ----- | ------- | ------------------ | --------- | ------------------------------ | ------- | ---------- | -------- | --- |
|                      |          |                  |          |                |                |       |         | Mehran             | Sahami.   | Learning                       | limited | dependence | Bayesian |     |
| simple               | Bayesian | classi(cid:12)er |          | under zero-one |                | loss. | Machine |                    |           |                                |         |            |          |     |
|                      |          |                  |          |                |                |       |         | classi(cid:12)ers. | InKDD-96: | ProceedingsoftheSecondInterna- |         |            |          |     |
| Learning,29:103{130, |          |                  | 1997.    |                |                |       |         |                    |           |                                |         |            |          |     |
tionalConferenceonKnowledgeDiscoveryandDataMin-
Nir Friedman, Dan Geiger, and Moises Goldszmidt. ing,pages 335{338. AAAIPress, 1996.
Bayesian network classi(cid:12)ers. Machine Learning, 29:131{ V.Vapnik. Estimationsofdependencesbasedonstatistical
| 163, 1997.                   |              |        |        |                 |          |               |                   | data. Springer   | Publisher, |                      | 1982. |         |               |         |
| ---------------------------- | ------------ | ------ | ------ | --------------- | -------- | ------------- | ----------------- | ---------------- | ---------- | -------------------- | ----- | ------- | ------------- | ------- |
| Jerome                       | H. Friedman. |        | On     | bias, variance, |          | 0/1 -         | loss, and         |                  |            |                      |       |         |               |         |
|                              |              |        |        |                 |          |               |                   | Yiming Yang      | and        | Jan Pederson.        |       | Feature | selection     | in sta- |
| the curse-of-dimensionality. |              |        |        | Data            | Mining   | and Knowledge |                   |                  |            |                      |       |         |               |         |
|                              |              |        |        |                 |          |               |                   | tisticallearning | of         | text categorization. |       | In      | ICML-97,1997. |         |
| Discovery,1:55{77,           |              | 1997.  |        |                 |          |               |                   |                  |            |                      |       |         |               |         |
| Louise                       | Guthrie      | and    | Elbert | Walker.         | Document |               | classi(cid:12)ca- |                  |            |                      |       |         |               |         |
| tion by                      | machine:     | Theory | and    | practice.       | In       | Proceedingsof |                   |                  |            |                      |       |         |               |         |
COLING-94,1994.

|                                     | acq             |                         |                                  |                      | corn                    |        |
| ----------------------------------- | --------------- | ----------------------- | -------------------------------- | -------------------- | ----------------------- | ------ |
| 100                                 |                 |                         |                                  | 100                  |                         |        |
|                                     |                 | Multinomial             |                                  |                      | Multinomial             |        |
|                                     |                 | Multi-variate Bernoulli |                                  |                      | Multi-variate Bernoulli |        |
| tnioP nevekaerB llaceR/noisicerP 80 |                 |                         | tnioP nevekaerB llaceR/noisicerP | 80                   |                         |        |
| 60                                  |                 |                         |                                  | 60                   |                         |        |
| 40                                  |                 |                         |                                  | 40                   |                         |        |
| 20                                  |                 |                         |                                  | 20                   |                         |        |
| 0                                   |                 |                         |                                  | 0                    |                         |        |
| 10                                  | 100 1000        | 10000                   | 100000                           | 10 100               | 1000 10000              | 100000 |
|                                     | Vocabulary Size |                         |                                  |                      | Vocabulary Size         |        |
|                                     | crude           |                         |                                  |                      | earn                    |        |
| 100                                 |                 |                         |                                  | 100                  |                         |        |
|                                     |                 | Multinomial             |                                  |                      | Multinomial             |        |
|                                     |                 | Multi-variate Bernoulli |                                  |                      | Multi-variate Bernoulli |        |
| tnioP nevekaerB llaceR/noisicerP 80 |                 |                         | tnioP nevekaerB llaceR/noisicerP | 80                   |                         |        |
| 60                                  |                 |                         |                                  | 60                   |                         |        |
| 40                                  |                 |                         |                                  | 40                   |                         |        |
| 20                                  |                 |                         |                                  | 20                   |                         |        |
| 0                                   |                 |                         |                                  | 0                    |                         |        |
| 10                                  | 100 1000        | 10000                   | 100000                           | 10 100               | 1000 10000              | 100000 |
|                                     | Vocabulary Size |                         |                                  |                      | Vocabulary Size         |        |
|                                     | grain           |                         |                                  |                      | money-fx                |        |
| 100                                 |                 |                         |                                  | 100                  |                         |        |
|                                     |                 | Multinomial             |                                  |                      | Multinomial             |        |
|                                     |                 | Multi-variate Bernoulli |                                  |                      | Multi-variate Bernoulli |        |
| tnioP nevekaerB llaceR/noisicerP 80 |                 |                         | tnioP nevekaerB llaceR/noisicerP | 80                   |                         |        |
| 60                                  |                 |                         |                                  | 60                   |                         |        |
| 40                                  |                 |                         |                                  | 40                   |                         |        |
| 20                                  |                 |                         |                                  | 20                   |                         |        |
| 0                                   |                 |                         |                                  | 0                    |                         |        |
| 10                                  | 100 1000        | 10000                   | 100000                           | 10 100               | 1000 10000              | 100000 |
|                                     | Vocabulary Size |                         |                                  |                      | Vocabulary Size         |        |
|                                     | trade           |                         |                                  |                      | wheat                   |        |
| 100                                 |                 |                         |                                  | 100                  |                         |        |
|                                     |                 | Multinomial             |                                  |                      | Multinomial             |        |
|                                     |                 | Multi-variate Bernoulli |                                  |                      | Multi-variate Bernoulli |        |
| 80                                  |                 |                         |                                  | 80                   |                         |        |
| tnioP nevekaerB llaceR/noisicerP    |                 |                         | tnioP nevekaerB llaceR/noisicerP |                      |                         |        |
| 60                                  |                 |                         |                                  | 60                   |                         |        |
| 40                                  |                 |                         |                                  | 40                   |                         |        |
| 20                                  |                 |                         |                                  | 20                   |                         |        |
| 0                                   |                 |                         |                                  | 0                    |                         |        |
| 10                                  | 100 1000        | 10000                   | 100000                           | 10 100               | 1000 10000              | 100000 |
|                                     | Vocabulary Size |                         |                                  |                      | Vocabulary Size         |        |
|                                     | Figure 6: The   | continuation            | of the                           | Reuters results from | Figure 5.               |        |