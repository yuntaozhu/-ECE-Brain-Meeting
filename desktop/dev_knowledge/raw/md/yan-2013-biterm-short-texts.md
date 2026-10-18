|     |     |     | A Biterm |     | Topic        |     | Model | for         | Short |     | Texts |     |     |     |     |
| --- | --- | --- | -------- | --- | ------------ | --- | ----- | ----------- | ----- | --- | ----- | --- | --- | --- | --- |
|     |     |     | Xiaohui  |     | Yan, Jiafeng |     | Guo,  | Yanyan Lan, | Xueqi |     | Cheng |     |     |     |     |
InstituteofComputingTechnology,CAS
Beijing,China100190
yanxiaohui@software.ict.ac.cn, {guojiafeng, lanyanyan, cxq}@ict.ac.cn
ABSTRACT
|     |     |     |     |     |     |     |     | 35, 14], | user interest | profiling    |     | [32],  | emerging        | topic | detect- |
| --- | --- | --- | --- | --- | --- | --- | --- | -------- | ------------- | ------------ | --- | ------ | --------------- | ----- | ------- |
|     |     |     |     |     |     |     |     | ing [20] | and so        | on. However, |     | unlike | the traditional |       | normal  |
Uncoveringthetopicswithinshorttexts,suchastweetsand
documents(e.g.newsarticlesandacademicpapers),thelack
| instant      | messages, | has           | become | an important | task        | for      | many   |                 |          |                |       |           |        |                |          |
| ------------ | --------- | ------------- | ------ | ------------ | ----------- | -------- | ------ | --------------- | -------- | -------------- | ----- | --------- | ------ | -------------- | -------- |
|              |           |               |        |              |             |          |        | of rich context |          | in short       | texts | makes     | the    | topic modeling | a        |
| content      | analysis  | applications. |        | However,     | directly    | applying |        |                 |          |                |       |           |        |                |          |
|              |           |               |        |              |             |          |        | challenging     | problem. |                |       |           |        |                |          |
| conventional | topic     | models        | (e.g.  | LDA          | and PLSA)   | on       | such   |                 |          |                |       |           |        |                |          |
|              |           |               |        |              |             |          |        | Conventional    |          | topic models,  |       | like PLSA |        | [16] and       | LDA [3], |
| short texts  | may       | not work      | well.  | The          | fundamental |          | reason |                 |          |                |       |           |        |                |          |
|              |           |               |        |              |             |          |        | are widely      | used     | for uncovering |       | the       | hidden | topics from    | text     |
liesinthatconventionaltopicmodelsimplicitlycapturethe
|     |     |     |     |     |     |     |     | corpus. | In general, | documents |     | are | modeled | as  | mixtures |
| --- | --- | --- | --- | --- | --- | --- | --- | ------- | ----------- | --------- | --- | --- | ------- | --- | -------- |
document-levelwordco-occurrencepatternstorevealtopics,
andthussufferfromtheseveredatasparsityin shortdocu- of topics, where a topic is a probability distribution over
ments. In this paper, we propose a novel way for modeling words. Statistical techniques are then utilized to learn the
topiccomponentsandmixturecoefficientsofeachdocument.
| topicsinshorttexts,referredasbiterm |     |     |     |     | topic model | (BTM). |     |             |     |              |     |              |     |            |        |
| ----------------------------------- | --- | --- | --- | --- | ----------- | ------ | --- | ----------- | --- | ------------ | --- | ------------ | --- | ---------- | ------ |
|                                     |     |     |     |     |             |        |     | In essence, | the | conventional |     | topic models |     | reveal the | latent |
Specifically,inBTMwelearnthetopicsbydirectlymodeling
|     |     |     |     |     |     |     |     | topics within | the | text | corpus | by implicitly |     | capturing | the |
| --- | --- | --- | --- | --- | --- | --- | --- | ------------- | --- | ---- | ------ | ------------- | --- | --------- | --- |
thegenerationofwordco-occurrencepatterns(i.e.biterms)
|              |         |     |           |            |     |        |     | document-level |     | word co-occurrence |     |     | patterns | [5, 30]. | There- |
| ------------ | ------- | --- | --------- | ---------- | --- | ------ | --- | -------------- | --- | ------------------ | --- | --- | -------- | -------- | ------ |
| in the whole | corpus. |     | The major | advantages |     | of BTM | are |                |     |                    |     |     |          |          |        |
fore,directlyapplyingthesemodelsonshorttextswillsuffer
| that 1)    | BTM explicitly |           | models    | the word           | co-occurrencepat- |          |        |               |          |               |         |          |           |                |      |
| ---------- | -------------- | --------- | --------- | ------------------ | ----------------- | -------- | ------ | ------------- | -------- | ------------- | ------- | -------- | --------- | -------------- | ---- |
|            |                |           |           |                    |                   |          |        | from the      | severe   | data sparsity |         | problem  | (i.e.     | the sparse     | word |
| terns to   | enhance        | the topic | learning; | and                | 2) BTM            | uses     | the    |               |          |               |         |          |           |                |      |
|            |                |           |           |                    |                   |          |        | co-occurrence | patterns |               | in each | short    | document) | [17].          | More |
| aggregated | patterns       | in        | the whole | corpus             | for learning      |          | topics |               |          |               |         |          |           |                |      |
|            |                |           |           |                    |                   |          |        | specifically, | 1) the   | occurrences   |         | of words | in        | short document |      |
| to solve   | the problem    | of        | sparse    | word co-occurrence |                   | patterns |        |               |          |               |         |          |           |                |      |
playlessdiscriminativerolecomparedtolengthydocuments
| at document-level. |     | We  | carry | out extensive | experiments |     | on  |     |     |     |     |     |     |     |     |
| ------------------ | --- | --- | ----- | ------------- | ----------- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
real-world short text collections. The results demonstrate wherethemodelhasenoughwordcountstoknowhowwords
that our approach can discover more prominent and coher- are related [17] ; 2) The limited contexts make it more dif-
|     |     |     |     |     |     |     |     | ficult for | topic models |     | to identify | the | senses | of ambiguous |     |
| --- | --- | --- | --- | --- | --- | --- | --- | ---------- | ------------ | --- | ----------- | --- | ------ | ------------ | --- |
enttopics,andsignificantlyoutperformbaselinemethodson
|                           |     |     |                           |     |     |     |     | words in | short documents. |     |     |     |     |     |     |
| ------------------------- | --- | --- | ------------------------- | --- | --- | --- | --- | -------- | ---------------- | --- | --- | --- | --- | --- | --- |
| severalevaluationmetrics. |     |     | Furthermore,wefindthatBTM |     |     |     |     |          |                  |     |     |     |     |     |     |
Onesimplebutpopularwaytoalleviatethesparsityprob-
canoutperformLDAevenonnormaltexts,showingthepo-
lemistoaggregateshorttextsintolengthypseudo-documents
| tential generality |     | and wider | usage | of the | new | topic model. |     |                                    |            |     |            |     |                 |               |     |
| ------------------ | --- | --------- | ----- | ------ | --- | ------------ | --- | ---------------------------------- | ---------- | --- | ---------- | --- | --------------- | ------------- | --- |
|                    |     |           |       |        |     |              |     | beforetrainingastandardtopicmodel. |            |     |            |     | Forexample,Weng |               |     |
|                    |     |           |       |        |     |              |     | et al. [32]                        | aggregated |     | the tweets |     | published       | by individual |     |
CategoriesandSubjectDescriptors user into one document before training LDA. Besides the
user-basedaggregation,Hongetal.[17]alsoaggregatedthe
| H.3.3 [Information |     | Search |     | and Retrieval]: |     | Information |     |     |     |     |     |     |     |     |     |
| ------------------ | --- | ------ | --- | --------------- | --- | ----------- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
tweetscontainingthesameword,andshownthattopicmod-
| Search and | Retrieval; | I.5.3 | [Pattern | Recognition]: |     |     | Clus- |     |     |     |     |     |     |     |     |
| ---------- | ---------- | ----- | -------- | ------------- | --- | --- | ----- | --- | --- | --- | --- | --- | --- | --- | --- |
tering els trained on these aggregated messages work better than
|     |     |     |     |     |     |     |     | the regular | LDA.       | However,        | such | heuristic |     | data aggregation |          |
| --- | --- | --- | --- | --- | --- | --- | --- | ----------- | ---------- | --------------- | ---- | --------- | --- | ---------------- | -------- |
|     |     |     |     |     |     |     |     | methods     | are highly | data-dependent. |      |           | For | example,         | the user |
Keywords
|     |     |     |     |     |     |     |     | information | is not | always | available |     | in some | datasets, | like |
| --- | --- | --- | --- | --- | --- | --- | --- | ----------- | ------ | ------ | --------- | --- | ------- | --------- | ---- |
Short Text, Topic Model, Biterm, Content Analysis, docu- the collection of Web page titles or advertisements. Even if
ment clustering the user information is available, e.g. in tweets data, most
usersonlyhavefewtweetswhichmakestheaggregationless
effective.
1. INTRODUCTION
Anotherwaytodealwiththeproblemistomakestronger
ShorttextsareprevalentontheWeb,nomatterintradi- assumptions on the data. A typical way is to assume that
tional Web sites, e.g. Web page titles, text advertisements a short document only covers a single topic. For example,
andimagecaptions,orinemergingsocialmedia,e.g.tweets,
|                  |          |               |       |               |           |          |       | Zhao et     | al. [35] | modeled | each     | tweet | in the | way of   | mixture  |
| ---------------- | -------- | ------------- | ----- | ------------- | --------- | -------- | ----- | ----------- | -------- | ------- | -------- | ----- | ------ | -------- | -------- |
| status messages, |          | and questions |       | in Q&A        | websites. | Uncover- |       |             |          |         |          |       |        |          |          |
|                  |          |               |       |               |           |          |       | of unigrams | [23].    | Similar | approach |       | can    | be found | in [12], |
| ing the          | topicsof | such short    | texts | is crucialfor |           | a wide   | range |             |          |         |          |       |        |          |          |
wherewordsineachsentenceareassumedtobedrawnfrom
ofcontentanalysistasks,suchascontentcharacterizing[26, the same topic. Compared to LDA and PLSA, the simpli-
|     |     |     |     |     |     |     |     | fied data | generation | process |     | may help | alleviate | the | sparsity |
| --- | --- | --- | --- | --- | --- | --- | --- | --------- | ---------- | ------- | --- | -------- | --------- | --- | -------- |
CopyrightisheldbytheInternationalWorldWideWebConference
|     |     |     |     |     |     |     |     | problem | in short | texts. | However, |     | it loses | the flexibility | to  |
| --- | --- | --- | --- | --- | --- | --- | --- | ------- | -------- | ------ | -------- | --- | -------- | --------------- | --- |
Committee(IW3C2).IW3C2reservestherighttoprovideahyperlink
capturedifferenttopicingredientsinonedocument,andsuf-
totheauthor’ssiteiftheMaterialisusedinelectronicmedia.
WWW 2013,May13–17,2013,RiodeJaneiro,Brazil.
ACM978-1-4503-2035-1/13/05.
1445

fers from overfitting issues due to the peaked posteriors of ment is presented as a mixture of topics, while a topic is a
topics P(z|d) [3]. probability distribution over words. Extending PLSA, La-
Unliketheseapproaches,inthispaper,weproposeanovel tent DirichletAllocation(LDA)[3] addsDirichletpriorson
topic model for short texts to tackle the sparsity problem. topic distributions, resulting in a more complete generative
Themainideacomesfromtheanswersofthefollowingtwo model. Duetoitsnicegeneralizationabilityandextensibil-
questions. 1) Since topics are basically groups of correlated ity, LDA achieves huge success in text mining domain.
wordsandthecorrelationisrevealedbywordco-occurrence In the last decade, topic models have been extensively
patterns in documents, why not explicitly model the word studied. Manymorecomplicatedvariantsandextensionsof
co-occurrence for topic learning? 2) Since topic models on LDA and PLSA have been proposed, such as the author-
shorttextssufferfromtheproblemofseveresparsepatterns topic model [27], Bayesian nonparametric topic model [29],
in short documents, why not use the rich global word co- and supervised topic model [2]. Among them two works
occurrencepatterns for better revealing topics? closetousaretherecentlyproposedregularizedtopicmodel[22]
Specifically, we propose a generative biterm topic model and the generalized P´olya model [21], which also employ
(BTM),whichlearnstopicsovershorttextsbydirectlymod- wordco-occurrencestatisticstoenhancetopiclearning. How-
eling the generation of biterms in the whole corpus. Here, ever, both of them utilize word co-occurrences as structure
a biterm is an unordered word-pair co-occurred in a short priorsfortopic-worddistribution,ratherthandirectlymod-
context. The data generation process under BTM is that eling their generation process. Above all, almost all the
the corpus consist of a mixture of topics, and each biterm modelsmentionedabovedealwithnormaltextwithoutcon-
isdrawnfromaspecifictopic. Comparedwithconventional sidering the specificity of short texts.
topicmodels,themajordifferencesandadvantagesofBTM
2.2 TopicModelsonShortTexts
lieinthat1)BTMexplicitlymodelsthewordco-occurrence
patterns (i.e. biterms), rather than documents, to enhance Earlystudiesmainlyfocusedonexploitingexternalknowl-
the topic learning; and 2) BTM uses the aggregated pat- edge to enrich the representation of short texts. For ex-
terns in the whole corpus for learning topics to solve the ample, Sahami et al.[28] suggested a search-snippet-based
problem of sparse patterns at document-level. By learning similarity measure for short texts. Phan et al.[24] learned
BTM,wecanobtainthetopiccomponentsandaglobaltopic hidden topics from large external resources to enrich the
distribution of the corpus, except the topic distribution of representation of short texts. Jin et al.[19] learned topics
eachindividualdocumentasitdoesnotmodelthedocument onshorttextsviatransferlearningfromauxiliarylongtext
generationprocess. However,weshowthatthetopicdistri- data. These ways may be helpful in some specific domains,
bution of each documentcan be naturally derived based on but not general since favorable external dataset might not
the learned model. bealwaysavailable. Additionally,theseapproachesandours
Weconductextensiveexperimentsontworeal-worldshort are complementary rather than competitive.
text collections, i.e. the datasets from Twitter and a Q&A Withtheemergenceofsocialmediainrecentyears,topic
website. Experimental results show that BTM can discover modelshavebeenutilizedforsocialmediacontentanalysisin
moreprominentandcoherenttopicsthanthebaselinemeth- various tasks, such as content characterizing [26, 35], event
ods. Quantitative evaluations confirm the superiority of tracking [20], content recommendation [25, 8], and influen-
BTM on several evaluation metrics. Additionally, we also tial users prediction [32]. However, due to the lack of spe-
test our approach on a normal text collection, i.e. 20News- cific topic models for short texts, some researchers directly
group. It is surprising for us to find that BTM can out- applied conventional (or slightly modified) topic models for
perform LDA even on normal texts, showing the potential analysis[26,31]. Someotherstriedtoaggregateshorttexts
generality and wider usage of the new topic model. into lengthy pseudo-documents based on some additional
The rest of the paper is organized as follows: in Section information, and then train conventional topic models [32,
2, we give a brief review of related works. Section 3 intro- 35]. Hong et al. [17] made a comprehensiveempirical study
duces our model for short text topic modeling, and discuss of topic modeling in Twitter, and suggested that new topic
its implementation in Section 4. Experimental results are models for short texts are in demand.
presentedinSection5. Finally,conclusionsaremadeinthe In our previous works, we developed methods based on
last section. non-negativematrixfactorizationforshorttextclustering[34]
andtopiclearning[33]byexploitingglobalwordco-occurrence
2. RELATEDWORKS information. This work extends them by proposing a more
principle approach to model topics over short texts. To the
In this section, we briefly summarize the related work
bestofourknowledge,theproposedtopicmodelisthefirst
fromthefollowingtwoperspectives: topicmodelsonnormal
one focusing on general-domainshort texts, which does not
texts, and that on short ones.
exploit any external knowledge.
2.1 TopicModelsonNormaltexts
3. OUR APPROACH
Topic models have been proposed to uncover the latent
semantic structure from text corpus. The effort of mining Conventionaltopicmodelslearntopicsbasedondocument-
semantic structure in a text collection can be dated from level word co-occurrence patterns, whose effectiveness will
latent semantic analysis (LSA) [9], which utilizes the sin- be highly influenced in short text scenario where the word
gular value decomposition of the document-term matrix to co-occurrence patterns become very sparse in each docu-
reveal the major associative words patterns. Probabilistic ment. To tackle this problem, here we propose a novel
latent semantic analysis (PLSA) [16] improves LSA with a biterm topic model, which learns topics over short texts by
sounderprobabilisticmodelbasedonamixturedecomposi- directlymodelingthegenerationofallthebiterms(i.e.word
tion derived from a latent class model. In PLSA, a docu- co-occurrencepatterns) in the whole corpus.
1446

Figure 1: Graphical representation of (a) LDA, (b) mixture of unigrams, and (c) BTM. Different from LDA
and mixture of unigrams, BTM models the generation procedure of biterms in a collection, rather than
documents. For clarity, the fixed hyperparameters α,β are not presented.
3.1 BitermExtraction 3. For each biterm b in the biterm set B
Withoutlossofgenerality,topicsarerepresentedasgroups
|               |     |       |          |         |       |     |               | (a) | draw | a topic | assignment |               | z∼Multi(θ) |     |     |
| ------------- | --- | ----- | -------- | ------- | ----- | --- | ------------- | --- | ---- | ------- | ---------- | ------------- | ---------- | --- | --- |
| of correlated |     | words | in topic | models, | while | the | correlationis |     |      |         |            |               |            |     |     |
|               |     |       |          |         |       |     |               |     |      |         |            | w ,w ∼Mulit(φ |            |     |     |
revealed by word co-occurrencepatterns in documents. For (b) draw two words: i j z )
example,ifthewords“apple”,“iphone”,“ipad”and“app”fre-
|         |          |      |      |       |        |      |              | Following | the  | above | procedure, | the | joint | probability | of a |
| ------- | -------- | ---- | ---- | ----- | ------ | ---- | ------------ | --------- | ---- | ----- | ---------- | --- | ----- | ----------- | ---- |
| quently | co-occur | with | each | other | in the | same | contexts, we |           |      |       |            |     |       |             |      |
|         |          |      |      |       |        |      |              |           | b=(w | ,w    |            |     |       |             |      |
canidentifythattheybelongtoasametopic(i.e.applecom- biterm i j) can be written as:
(cid:2)
| pany | and its | products). | Conventional |     |     | topic models | implic- |     |      |     |     |         |        |      |     |
| ---- | ------- | ---------- | ------------ | --- | --- | ------------ | ------- | --- | ---- | --- | --- | ------- | ------ | ---- | --- |
|      |         |            |              |     |     |              |         |     | P(b) | =   |     | P(z)P(w | |z)P(w | |z). |     |
itly capture such word co-occurrence patterns by modeling i j
(cid:2)z
| word | generation | from | the | document | level. | Different | from |     |     |     |     |       |     |     |     |
| ---- | ---------- | ---- | --- | -------- | ------ | --------- | ---- | --- | --- | --- | --- | ----- | --- | --- | --- |
|      |            |      |     |          |        |           |      |     |     | =   |     | θ φ φ |     |     | (1) |
those approaches, our BTM directly models the word co- z i|z j|z
| occurrencepatternsbasedonbiterms. |     |     |     |     |     | Abitermdenotesan |     |     |     |     | z   |     |     |     |     |
| --------------------------------- | --- | --- | --- | --- | --- | ---------------- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
unorderedword-pairco-occurringinashortcontext(i.e.an Thus the likelihood of the whole corpus is:
instanceofwordco-occurrencepattern). Heretheshortcon- (cid:3)(cid:2)
text refers to a proper text window containing meaningful P(B) = θ z φ i|z φ j|z (2)
word co-occurrences. In short texts, since documents are (i,j) z
usuallyshortandspecific,wejusttakeeachdocumentasan
|            |            |          |     |              |     |              |        | We can     | see      | that, | here   | we directly | model  | the      | word co- |
| ---------- | ---------- | -------- | --- | ------------ | --- | ------------ | ------ | ---------- | -------- | ----- | ------ | ----------- | ------ | -------- | -------- |
| individual | context    | unit.    | We  | extract      | any | two distinct | words  |            |          |       |        |             |        |          |          |
|            |            |          |     |              |     |              |        | occurrence | pattern, |       | rather | than a      | single | word, as | an unit  |
| in a       | short text | document |     | as a biterm. |     | For example, | in the |            |          |       |        |             |        |          |          |
short text document “I visit apple store.”, if we ignoring conveying semantics of topics. No doubt the co-occurrence
ofapairofwordscanmuchbetterrevealthetopicsthanthe
| the stop      | word“I”,      | there  | are        | three | biterms, | i.e.“visit | apple”,       |            |           |          |         |          |         |           |          |
| ------------- | ------------- | ------ | ---------- | ----- | -------- | ---------- | ------------- | ---------- | --------- | -------- | ------- | -------- | ------- | --------- | -------- |
|               |               |        |            |       |          |            |               | occurrence | of        | a single | word,   | and then | enhance | the       | learning |
| “visit        | store”,“apple |        | store”.    | The   | biterms  | extracted  | from all      |            |           |          |         |          |         |           |          |
|               |               |        |            |       |          |            |               | of topics. | Moreover, |          | all the | biterms  | from    | the whole | corpus,  |
| the documents |               | in the | collection |       | compose  | the        | training data |            |           |          |         |          |         |           |          |
ratherthanfromasingledocument,areaggregatedtogether
of BTM.
|     |     |     |     |     |     |     |     | for the | topic learning. |     | Therefore, | we  | can | fully leverage | the |
| --- | --- | --- | --- | --- | --- | --- | --- | ------- | --------------- | --- | ---------- | --- | --- | -------------- | --- |
3.2 BitermTopicModel richglobalwordco-occurrencepatternstobetterrevealthe
latent topics.
| The                                       | key    | idea of BTM | is  | to learn | topics | over  | short texts   |              |       |               |     |                |      |              |      |
| ----------------------------------------- | ------ | ----------- | --- | -------- | ------ | ----- | ------------- | ------------ | ----- | ------------- | --- | -------------- | ---- | ------------ | ---- |
|                                           |        |             |     |          |        |       |               | For better   |       | understanding |     | the uniqueness |      | of BTM       | from |
| based                                     | on the | aggregated  |     | biterms  | in the | whole | corpus to     |              |       |               |     |                |      |              |      |
|                                           |        |             |     |          |        |       |               | conventional | topic | models,       |     | here we        | make | a comparison | be-  |
| tacklethesparsityprobleminsingledocument. |        |             |     |          |        |       | Specifically, |              |       |               |     |                |      |              |      |
tweenBTMandtwotypicalmodelsfortopiclearning,i.e.LDA
| we consider |      | that the | whole    | corpus | as         | a mixture | of topics, |             |     |           |     |          |             |     |           |
| ----------- | ---- | -------- | -------- | ------ | ---------- | --------- | ---------- | ----------- | --- | --------- | --- | -------- | ----------- | --- | --------- |
|             |      |          |          |        |            |           |            | and mixture | of  | unigrams. |     | Figure 1 | illustrates | the | graphical |
| where       | each | biterm   | is drawn | from   | a specific | topic     | indepen-   |             |     |           |     |          |             |     |           |
dently1. representation of the three models. We can see, in LDA
Theprobabilitythatabitermdrawnfromaspecific
|               |                   |           |              |                 |             |         |          | each document    |              | is generated |                | by first | drawing     | a document-   |      |
| ------------- | ----------------- | --------- | ------------ | --------------- | ----------- | ------- | -------- | ---------------- | ------------ | ------------ | -------------- | -------- | ----------- | ------------- | ---- |
| topicis       | furthercapturedby |           |              | the chancesthat |             | both    | words in |                  |              |              | θ              |          |             |               |      |
|               |                   |           |              |                 |             |         | α β      | level topic      | distribution |              | d,             | and then | iteratively | sampling      | a    |
| the biterm    |                   | are drawn | from         | the topic.      | Suppose     |         | and are  |                  |              |              |                |          |             |               |      |
|               |                   |           |              |                 |             |         |          | topic assignment |              | z for        | each           | word w   | in the      | document.     | LDA  |
| the Dirichlet |                   | priors.   | The          | specific        | generative  | process | of the   |                  |              |              |                |          |             |               |      |
|               |                   |           |              |                 |             |         |          | implicitly       | captures     | the          | document-level |          | word        | co-occurrence |      |
| corpus        | in BTM            | can       | be described |                 | as follows: |         |          |                  |              |              |                |          |             |               |      |
|               |                   |           |              |                 |             |         |          | patterns         | since        | the topic    | assignment     |          | variable    | z of each     | word |
dependsonotherwordsinthesamedocumentthroughshar-
| 1.  | For each | topic | z   |     |     |     |     |         |      |                |     |       |              |      |        |
| --- | -------- | ----- | --- | --- | --- | --- | --- | ------- | ---- | -------------- | --- | ----- | ------------ | ---- | ------ |
|     |          |       |     |     |     |     |     | ing the | same | document-level |     | topic | distribution | θ d. | Hence, |
(a) drawatopic-specificworddistributionφ ∼Dir(β) whendocumentsareshort,LDAwillsufferfromthesparsity
z
|           |            |         |              |     |               |     |             | problem                                         | due to    | its excessive |        | reliance   | on  | local observations |         |
| --------- | ---------- | ------- | ------------ | --- | ------------- | --- | ----------- | ----------------------------------------------- | --------- | ------------- | ------ | ---------- | --- | ------------------ | ------- |
| 2.        | Draw       | a topic | distribution |     | θ ∼ Dir(α)    | for | the whole   |                                                 |           |               |        |            |     | z,                 |         |
|           |            |         |              |     |               |     |             | for the                                         | inference | of word       | topic  | assignment |     | which              | in turn |
|           | collection |         |              |     |               |     |             |                                                 |           |               |        | φ.         |     |                    |         |
|           |            |         |              |     |               |     |             | hurts the                                       | learning  | of            | topics |            |     |                    |         |
| 1Strictly |            |         |              |     |               |     |             | DifferentfromLDA,mixtureofunigramsdrawsthetopic |           |               |        |            |     |                    |         |
|           | speaking,  |         | two biterms  |     | in a document |     | sharing the |                                                 | z         |               |        |            |     |                    |         |
same word occurrence are not independent. This simplified assignment for each document from a corpus-level topic
assumption facilitate the computation by considering BTM distributionθ. Leveragingtheinformationofthewholecor-
as a model built upon a biterm set. pus, it alleviates the sparsity problem in topic inference,
1447

which in turn helps the learning the topic components φ. Algorithm 1: Gibbs sampling algorithm for BTM
However,mixtureofunigramsassumesthatallthewordsin Input: thenumberoftopicsK,hyperparametersα,β,
adocumentaresampledfromthesametopic. Thisassump- biterm set B
tion is so strong that it prevents the model from modeling Output: multinomial parameter φ and θ
finetopicsindocuments. Aswecansee,eveninshorttexts, initialize topic assignments randomly for all the
there might be multiple topics in one document. biterms
BTM, shown in Figure 1(c), overcomes the data spar- for iter = 1 to N iter do
sity problem of LDA by drawing topic assignment z from for b∈B do
thecorpus-leveltopicdistributionθ asmixtureofunigrams draw z b from P(z|z−b ,B,α,β)
does. Meanwhile,italsosurmountsthedisadvantageofmix- update n z, n wi|z, and n wj|z
ture of unigrams by breaking documents into biterms. In
this way, BTM not only can keep the correlation between compute the parameters φ in Eq.(5) and θ in Eq.(6)
words, but also can capture multiple topic gradients in a
document, since the topic assignments of different biterms
in a document are independent. ing it preferred for large-scale dataset. More detailed com-
parison of these methods can be found in [1].
3.3 InferringTopicsinaDocument
The basic idea of Gibbs sampling is to estimate the pa-
A major difference between BTM and conventional topic rametersalternatively,byreplacingthevalueofonevariable
models is that BTM does not model the document genera- byavaluedrawnfromthedistributionofthatvariablecon-
tionprocess. Therefore,wecannotdirectlyobtainthetopic ditioned on the values of the remaining variables. In BTM,
proportionsofdocumentsduringthetopiclearningprocess. we need to sample all the three types of latent variables z,
Toinferthetopicsinadocument,weassumethatthetopic φ and θ. However, with the technique of collapsed Gibbs
proportions of a document equals to the expectation of the sampling [10], φ and θ can be integrated out due to the
topic proportionsof biterms generated from the document: conjugate priors α and β. Consequently, we only have to
(cid:2) samplethetopicassignmentforeachbitermfromitscondi-
P(z|d)= P(z|b)P(b|d). (3) tional distribution given the remaining variables.
b To perform Gibbs sampling, we first choose initial states
InEq.(3),P(z|b)canbecalculatedviaBayes’formulabased fortheMarkovchainrandomly. Thenwecalculatethecon-
on the parameters estimated in BTM:
ditional distribution P(z|z−b ,B,α,β) for each biterm b =
(w i ,w j), where z−b denotes the topic assignments for all
P(z|b)= (cid:4) P(z)P(w i |z)P(w j |z) , biterms except b, B is the global biterm set. By applying
z P(z)P(w i |z)P(w j |z) thechainruleonthejointprobabilityofthewholedata,we
can obtain the conditional probability conveniently:
where P(z) = θ z, and P(w i |z) = φ i|z. Then the remaining
e
p
m
ro
p
b
i
l
r
e
i
m
cal
is
d
h
is
o
t
w
rib
t
u
o
ti
o
o
b
n
ta
o
in
f b
P
it
(
e
b
r
|d
m
)
s
. H
in
er
t
e
he
we
do
s
c
im
um
pl
e
y
nt
ta
a
k
s
e
t
t
h
h
e
e P(z|z−b ,B,α,β)∝(n z+α) (n
(
w(cid:4)i|z
w
+
n w
β
|
)
z
(n
+
w
M
j|z
β
+
)2
β) , (4)
estimation
wheren
z
isthenumberoftimesofthebitermbassignedto
P(b|d)= (cid:4) n d(b) , the topic z, and n w|z is the number of times of the word w
b n d(b) assigned to the topic z. Following the conventions of LDA,
d w . he I r n e s n h d o ( r b t )i t s ex th ts e , f P re ( q b u |d en ) c i y s o n f e t a h rl e y b a it n er u m ni b fo in rm th d e is d t o r c ib u u m t e io n n t h on er c e e w a e bi u t s e e rm sy b m i m s e a t s r s i i c gn D e i d ri t c o hl t e h t e p t r o io p r i s c α z, a t n h d et β w . o N w o o t r e d t s h w at i
overallbitermsinthedocumentd. Despiteofitssimplicity, and w j in it will be assigned to the topic simultaneously.
Finally, with the counters of the topic assignments of
we findthisestimationalwaysobtainsgoodresultsin prac-
biterm and word occurrences, we can easily estimate the
tice. More sophisticated ways may be studied in the future
topic-word distributions φ and global topic distribution θ
work.
as:
4. PARAMETERSINFERENCE φ w|z = (cid:4) w n n w w |z |z + + β Mβ , (5)
Inthissection,wedescribethealgorithmtoinferthepa-
rameters {φ,θ} in BTM, and compare its complexity with θ z = |B n | z + + K α α , (6)
LDA.
where |B| is the total number of biterms.
4.1 InferencebyGibbsSampling
An overview of the Gibbs sampling procedure we use is
SimilarasLDA,inferencecannotbedoneexactlyinBTM. showninAlgorithm1. Duetospacelimitation,weomitthe
Hence, we adopt Gibbs sampling to perform approximate detailed derivation of it.
inference. Gibbs sampling is a simple and widely appli-
4.2 ComplexityAnalysis
cable Markov chain Monte Carlo algorithm. Compared to
otherinferencemethodsforlatentvariablemodels,likevari- The major time consuming part in the Gibbs sampling
ationalinferenceandmaximumposteriorestimation,Gibbs procedure of BTM is evaluating the conditional probability
sampling has two advantages. First, it is in principal more inEq.(4)forallthebiterms,withtimecomplexityO(K|B|).
accurate since it asymptotically approaches the correct dis- Duringtheentire process,we need to keep thecountersn z,
tribution. Second, it is more memory-efficient since it only n w|z,andthetopicassignmentz foreachbiterm,intotalof
requires to maintain the counters and state variables, mak- (K+MK+|B|)variablesinmemory. NotethatinLDA,we
1448

Table 1: Time complexity and the number of vari- Table3: Memorycost(m)periterationofBTMand
ables need to be maintained in Gibbs sampling im- LDA on Tweets2011 collection.
plementation of LDA, mixture of unigrams, and K 50 100 150 200 250
BTM LDA 3177m 5524m 7890m 10218m 12561m
method time complexity #variables BTM 927m 946m 964m 984m 1002m
LDA O(K|D|¯l) |D|K+MK+|D|l
BTM O(K|B|) K+MK+|B|
andmixtureofunigramswereimplementedviaC++code3.
For LDA, we used the open-source implementation Gibb-
Table 2: Time cost (seconds) per iteration of BTM sLDA++4. Parametersweretunedviagridsearch: forLDA,
and LDA on Tweets2011 collection. α = 0.05 and on short text collections, and α = 50/K on
K 50 100 150 200 250 the normal text collection, β =0.01; for BTM and mixture
LDA 38.07s 74.38s 108.13s 143.47s 178.66s of unigrams, α = 50/K and β = 0.01. In all the methods,
BTM 128.64s 250.07s 362.27s 476.19 s 591.24s Gibbs sampling was run for 1,000 iterations. The results
reported are the average over 10 runs.
One typical way for topic model evaluation is to com-
needtodrawtopicassignmentforeverywordoccu(cid:4)rrencein paretheperplexityormarginallikelihoodonaheld-outtest
documents,whichcoststimeO(K|D|¯l),where¯l=
i
l
i
/|D|
set[3, 11, 12]. However,sinceBTMnotmodelsthegenera-
is the average length of documents in the collection. For tionprocessofdocuments,thesemeasuresarenotavailable
memorycost,LDA hasto maintainthecountersn z|b, n w|z, for us. Moreover, these measures do not reflect the topic
and the topic assignment z for each word occurrences[15], quality rightly [6]. Therefore, we evaluate the performance
in total of (|D|K+MK+|D|l) variables. Table 1 lists the of BTM on topic modeling on some other task-dependent
time complexity and variables required to be maintained in metrics.
the Gibbs sampling procedure of LDA, and BTM.
TocomparethetimeandmemorycostbetweenBTMand 5.1 EvaluationonTweets2011Collection
LDA, we approximately rewrite |B| as2: ToverifytheeffectivenessofBTMonshorttexts,wecar-
|D|¯l(¯l−1) riedexperimentsonastandardshorttextcollection,namely
|B|≈ . Tweets20115. It was published in TREC 2011 microblog
2
track,whichprovidesapproximately16milliontweetssam-
We can see the time complexity of BTM is about (¯l−1)/2 pled between January 23rd and February 8th, 2011. Be-
times of LDA. In short texts, the average length of docu- sides the complete content of tweets, it also includes an
ments are very small, e.g. ¯l = 5.21 in the Tweets2011 col- user id, and a timestamp for each tweet. To reduce low-
lection, thus the run-time of BTM is still comparable with qualitytweets,weprocessedtherawcontentviathefollow-
LDA.However,forverylargedatasetandalargetopicnum- ing normalization steps: (a) removing non-Latin characters
ber K, LDA is susceptible to memory problems owing to a and stop words; (b) converting letters into lower case; (c)
huge value of |D|K. removing words with document frequency less than 10; (d)
Table2showstheaveragerun-time(periteration)ofBTM filteringouttweetswithlengthlessthan2;(e)removingdu-
and LDA in our experiments on the Tweets2011 collection. plicatetweets. Atlast,weleft4,230,578validtweets,98,857
We find the run-time of BTM is always about 3 times of distinct words, and 2,039,877 users. The average document
LDA for differenttopicnumberK. Table3 showsthe over- length is 5.21.
all memory cost of BTM and LDA in the same collection. We compared BTM with three topic modeling methods
We find that memory required by LDA rapidlyincreases as on this short texts collection: (a) the standard LDA, which
the topicnumberK grows, which costsmore than10 times takes each tweet as a document; (b) LDA-U, which aggre-
of memory than BTM when K is larger than 200. As op- gates all the tweets from a user to a big psudo-document
posedtoLDA,memoryrequiredbyBTMgrowsveryslowly. before training LDA; (c) mixture of unigrams (denoted as
With further investigation, we find the major part of mem- Mix),whichassumeseachtweetonlyexhibitsasingletopic.
oryinBTMisusedtostorethebitermsintrainingdataset. In this collection, we set the number of topics K = 50 for
Therefore, BTM is a better choice for large dataset and a all the methods.
large topic number K, when the memory cost is a bottle-
neck. 5.1.1 QualityofTopics
To investigate the quality of topics discovered by all the
5. EXPERIMENTS test methods, we first sample some topics for visualization.
Following [7], we randomly drew two topics shared by the
Inthissection,weconductexperimentsonreal-worldshort
topic sets discovered by the four methods. The selection
text collections to demonstrate the effectiveness of our pro-
processis described as follows. Firstly, we collected the top
posed approach. We take two typical topic models as our
5wordsineachtopicintoatopicalwordsetforeachmethod
baseline methods, namely LDA and mixture of unigrams.
individually. Then we randomly chose two terms (i.e., job
All the experiments were carried on a Linux server with
and snow) from the intersection of the four topical word
Intel Xeon 2.33 GHz CPU and 16G memory. Both BTM
sets. For each topic, besides the top 20 words, which are
2For a document with length l, we generate l(l − 1)/2
biterms. Here we simply take all the documents as with 3Code of BTM : http://code.google.com/p/btm/
the same length, since the variance of the length of short
4http://gibbslda.sourceforge.net/
documents is not large. 5http://trec.nist.gov/data/tweets/
1449

most representative for a topic, we also listed 20 non-top
words (i.e. ranked from 1001 to 1020) ordered by P(w|z). Table6: AveragecoherencescoreonthetopT words
(ordered by P(w|z)) in topics discovered by LDA,
Ideally, a high quality topic should be coherent as much
LDA-U, mixture of unigrams, and BTM. A larger
as possible. Hence, it is expected that the non-top words
coherence score means the topics are more coher-
should be relevant to the top words in the same topic.
ent. It suggests that BTM outperforms others sig-
Table 4 presents the top words (first row) and non-top
nificantly (P-value <0.01 by t-test).
words (second row) of the topic selected by the word“job”.
T 5 10 20
Wefindthetwowords“job”and“jobs”arerankedhighestby
LDA −55.0±0.4 −236.4±2.0 −1015.7±5.9
all the four methods. However, in LDA, some other words,
LDA-U −54.2±0.8 −234.8±1.1 −1009.4±4.4
like “web”, “website”, and “google”, are more related to a
Mix −53.8±0.1 −233.0±1.4 −1007.6±6.7
topic about website, rather than job. The results in LDA-
BTM −52.4±0.1 −227.8±0.3 −990.2±3.8
U and mixture of unigrams seem a little better than LDA,
but still include a few of less relevant words like“website”
and “www”. While in BTM, the top 20 words are more
prominent and precise about“job”. In the non-top words, Table7: Hashtagsusedforevaluation,notincluding
we find LDA includes the least words about“job”, which is the prefix ’#’.
hard to connect them to the top words. On the contrary, jan25 superbowl sotu wheniwaslittle mobsterworld jobs
BTMincludesmorerelevantwordsabout“job”thanothers, agoodboyfriendbieberfact glee lfc rhoa itunes thegame
suggesting this topic discovered by BTM is more coherent. celebrity tcyasi americanidol cancer socialmedia jerseyshore
Table 5 presents the top words (first row) and non-top photographyjp6foot7remix factsaboutboysmeatschool
words (second row) of the topic selected by another word libra android sagittarius thissummer tnfisherman sagawards
“snow”. Inthefirstrow,againwecanseethatthetopwords ausopen bears weather jaejoongday skins bfgw fashion
in LDA are mixed with words about two different subjects pandora realestate teamautism travel nba football marketing
“weather” and “car”. The results in LDA-U is similar to design oscars food dating kindle snow obama
LDA,butmoreabout“weather”. Incontrast,thetopwords
in mixture of unigrams and BTM clearly describe weather.
Inthesecondrow,bothLDAandLDA-Ulistwordsalmost 5.1.2 QualityofTopicalRepresentationofDocuments
havenoconnectionto“snow”,whilesomeofthemarerelated In the Tweets2011 collection, there is no category infor-
to“car”. For mixture of unigrams, it is hard to explain the mationfortweets. Manuallabelingmightbedifficultdueto
topic based on these non-top words. In BTM, there are theincompleteandinformalcontentoftweets. Fortunately,
still many words about “weather”, like “temperature” and some tweets are labeled by their authors with hashtags in
“cyclone”. Besides the two topics presented here, we also the form of“#keyword”. By investigatingthe data, we find
findsimilarphenomenoninremainingtopics,whichsuggests therearemainlythreetypesofusageofhashtags: (a)mark-
that the topics discovered by BTM are is more prominent ing events or topics; (b) defining the types of content, like
and coherent than the three baselines. “#ijustsayin”, “#quote”; (c) realizing some specified func-
Inordertoperformmorecomprehensiveanalysis,weuti- tions, like“#fb”means importing the tweet to Facebook in
lizeanautomatedmetric,namelycoherencescore,proposed the meanwhile. In our case, only the first type of hashtags
by Mimno et al [21] for topic quality evaluation. Given a are useful. Therefore, we manually chose 50 frequent hash-
topicz anditstopT wordsV(z) =(v(z),...,v(z) )orderedby tags in type (a), listed in Table 7.
1 T
P(w|z), the coherence score is defined as: Since each hashtag in Table 7 denotes a specific topic la-
beledbyitsauthor,weorganizeddocumentswiththesame
hashtag into a cluster. The following evaluation is based
C(z;V(z) )= (cid:2)T (cid:2)t log D(v m (z),v l (z) )+1 , on thefactthattheseclustersshouldhavelow intra-cluster
D(v(z) ) distances and high inter-cluster distances.
t=2l=1 l
Consideringtopicmodelsasatypeofdimensionreduction
whereD(v)isthedocumentfrequencyofwordv,D(v,v(cid:2))is
methods, each document can be represented by a vector of
the number of documents words v and v(cid:2) co-occurred. The posterior distribution of topics:
coherencescoreisbasedontheideathatwordsbelongingto
a single concept will tend to co-occur within the same doc- d i =[p(z 1 |d i),...,p(z k |d i)]. (7)
uments. It is empirically demonstrated that the coherence
Thenwecanmeasurethedistanceoftwodocumentsbythe
score is highly correlated with human-judged topic coher-
Jensen–Shannondivergence:
ence. It must be stressed that the coherence score only is
appropriate for measuring frequent words in a topic. Be- 1 1
cause the frequency of rare words is less reliable. dis(d i ,d j)= 2 D KL(d i ||m)+ 2 D KL(d j ||m),
Toevaluatetheoverallqualityofatop(cid:4)icset,wecalculated (cid:4)
theaveragecoherencescore,namely K 1 k C(z k;V(zk)),for where m = 1 2 (d i+d j), and D KL(p||q) = i p ilnp qi i is the
eachmethod. TheresultislistedinTable6,wherethenum- Kullback–Leibler divergence. Given a set of clusters C =
ber of top words T ranges from 5 to 20. We find the result {C 1 ,...,C K }, we introduce two distance scores
isinagreementwithpreviousqualitativeanalysis. BTMre- Average Intra-Cluster Distance:
⎡ ⎤
ceives the highest coherence score in all the settings, and
T L th D - e t A e s s u t s p ) l . i e g r B h io t o l r t y i h t , y b L u i D s t A s t t h - a U e tis d a t i n i ff c d e a r l m l e y n ix c s e t ig u s n r a e ifi re o ca f n n u o t n t ( i s g P i r g - a n v m a ifi l s u c e a o n u < t t . p 0 e . r 0 f 1 or b m y IntraDis(C)= K 1 (cid:2) k K =1 ⎢ ⎢ ⎣ di, (cid:2) dj∈Ck | 2 C d k i | s | ( C d k i , − d j 1 ) | ⎥ ⎥ ⎦
i(cid:4)=j
1450

Table 4: Topics selected by the word“job”on the Tweets collection. The first row lists the top 20 words,
P(w|z).
while the second row lists non-top words ranked from 1001 to 1020 based on
| LDA |     |     |     | LDA-U |     | Mixtureofunigrams |     |     | BTM |     |     |     |
| --- | --- | --- | --- | ----- | --- | ----------------- | --- | --- | --- | --- | --- | --- |
jobjobsbusinessweb jobjobsdesignmanager jobsjobbusiness jobsjobmanagerbusiness
websitegoogledesignonline projectwebwebsitesite marketingsocialmedia saleshiringserviceservices
marketingsiteblogproject businessservice onlinewebdesignwebsite projectcompanysenior
managersearch companyhiringwww managerblogprojectseo engineermanagement
wwwcompanyservice supportsalesservices internetsalestips marketingnurseofficeassistant
salesservicespost londonblogseniorengineer companysitehiring centercustomerdevelopment
nonprofitgalleryannounced expertiseunemployedmediii understandrepindustrial springfieldmlmrecruitoilreq
presencepublishedconverting hosteducationalforttags sustainabilityrankings unemploymentprocessing
selectrepsrequirementmgr appsassignmentslabor scholarshipsstaysinglecampus overviewawardsrecruiters
territoryrecruiterspower introductionleadsgithub extracheap101vprelationships ictfinishentrepreneurcomp
involvedannounceposter assuranceavonmanchester beginnerscoloradocompliance assist1000alliancelocations
larrydynamicsfeedsbristol startingautomotivetable facewinningmechanical patentauditor
Table 5: Topics selected by the word“snow”on the Tweets collection. The first row lists the top 20 words,
P(w|z).
while the second row lists non-top words ranked from 1001 to 1020 based on
| LDA |     |     |     | LDA-U |     | Mixtureofunigrams |     |     | BTM |     |     |     |
| --- | --- | --- | --- | ----- | --- | ----------------- | --- | --- | --- | --- | --- | --- |
snowcarweathercold snowweathercoldwinter snowweathercoldstorm snowcoldweatherearly
drivestormwinterice icestormrainstay wintericerainwarm stayreadyicewinter
roadbusdrivingrain warmduecarclosed degreesstaysunspring stormhourhoursweekend
ridetrafficcarssafe comingspringdrivetraffic safeblizzardcomingwind warmlatecomingspring
closedduewarmtrain safesunblizzardcity cyclonechicagofreezinginches raintiredsunhot
westerndmvcoveringa4 locationssunsetdrizzle australianthankfulstation temperaturecyclone
pushpullingmilwaukee mississippiinterstateresidents stopsgroundhogdaypossibly warmthissuedcolder
remainspaceidiots95 portlandstudentsfireplace clevelandtravelingsidewalk moodcouchsnowspre
commuterbuickowner lettingyucktoncountiessignal coveringpredictingtengrass travelingpolaroutages
ctatransmissioncyclist countingblanketspushed meantdoubleaffect umbrellafilledyawnoutage
flurriescampingtyre 3pmspringfieldventure zooscheduleblewcausing flurriesonlineglovesspeed
| Average | Inter-Cluster |     |     | Distance: |     |       |      |       |               |     |         |        |
| ------- | ------------- | --- | --- | --------- | --- | ----- | ---- | ----- | ------------- | --- | ------- | ------ |
|         |               |     |     |           |     | Table | 8: H | score | for different |     | methods | on the |
|         |               |     |     | ⎡         |     | ⎤     |      |       |               |     |         |        |
(cid:2) (cid:2) (cid:2) T w e e t s 2 0 11 c o l l e c ti o n , s m a lle r v a l u e i s b e t te r . Th e
|     |     | 1   |     |     | dis(d ,d | j)⎦ |     |     |     |     |     |     |
| --- | --- | --- | --- | --- | -------- | --- | --- | --- | --- | --- | --- | --- |
InterDis(C)= ⎣ i sig n i fi c a n t le v e l s ( P - v a lu e b y t -t e s t ) a r e d e n o t ed a s
|     |     | K(K−1) |     |                         | |C ||C   | |                      |     |           |     |                        |     |     |
| --- | --- | ------ | --- | ----------------------- | -------- | ---------------------- | --- | --------- | --- | ---------------------- | --- | --- |
|     |     |        |     |                         | k        | k(cid:2) 0.1*, 0.01**, |     | 0.001***. |     |                        |     |     |
|     |     |        | Ck  | ,C (cid:2) ∈C di∈Ckdj∈C | k(cid:2) |                        |     |           |     |                        |     |     |
|     |     |        |     | k (cid:2)               |          | Method                 |     | H score   |     | Significantdifferences |     |     |
|     |     |        |     | k (cid:4)= k            |          |                        |     |           |     |                        |     |     |
0.576±0.007
LDA
The intuition is that if the average inter-cluster distance 0.564±0.011 >LDA*
LDA-U
is small compared to the average intra-cluster distance, the 0.503±0.008 >LDA-U**>LDA***
Mix
topicalrepresentationofdocumentsagreeswellwithhuman 0.474±0.005 >Mix***>LDA-U***>LDA***
BTM
| labeled   | clusters     | (via hashtag). |        | Therefore, | we calculate the   |          |       |              |     |             |     |            |
| --------- | ------------ | -------------- | ------ | ---------- | ------------------ | -------- | ----- | ------------ | --- | ----------- | --- | ---------- |
| following | ratio        | to evaluate    | the    | quality of | one topical repre- |          |       |              |     |             |     |            |
| sentation | of documents |                | as [4, | 13]:       |                    |          |       |              |     |             |     |            |
|           |              |                |        |            |                    | unigrams | fails | to recognize | the | resemblance | of  | many docu- |
ments.
IntraDis(C)
|     |     | H   | =   | .   |     | Fromtheaboveresults,wefindtheimprovementofLDA- |     |     |     |     |     |     |
| --- | --- | --- | --- | --- | --- | ---------------------------------------------- | --- | --- | --- | --- | --- | --- |
InterDis(C)
|     |     |     |     |     |     | UoverLDAisnotsomuchasshownin[17]. |            |         |       |          | Anexplanation |              |
| --- | --- | --- | --- | --- | --- | --------------------------------- | ---------- | ------- | ----- | -------- | ------------- | ------------ |
|     |     |     |     |     |     | for this                          | difference | is that | there | are less | tweets        | posted by an |
Givenasetofdifferenttopicalrepresentationsofdocuments,
|          |        |       |           | H          |     | user in | average | in our | dataset | than theirs. | Figure | 2 shows |
| -------- | ------ | ----- | --------- | ---------- | --- | ------- | ------- | ------ | ------- | ------------ | ------ | ------- |
| the best | one is | which | minimizes | the score. |     |         |         |        |         |              |        |         |
Table8showstheH theproportionsofuserswhopostedcertainnumberoftweets
|     |     |     | scoreforallthetestmethods. |     | From |                   |     |             |     |            |     |              |
| --- | --- | --- | -------------------------- | --- | ---- | ----------------- | --- | ----------- | --- | ---------- | --- | ------------ |
|     |     |     |                            |     |      | in the Tweets2011 |     | collection, | we  | find 63.3% | of  | users posted |
theresults,wecanseethatBTMpreformssignificantlybet-
onetweet,andonly2.1%ofuserspostedmorethan9tweets.
| ter than | other | three | methods | (P-value < | 0.001). LDA-U |     |     |     |     |     |     |     |
| -------- | ----- | ----- | ------- | ---------- | ------------- | --- | --- | --- | --- | --- | --- | --- |
outperformsLDAslightly,implyingthataggregatingtweets Thusitisnotstrangethataggregatingtweetsforindividual
forindividualusersbringsmoderatebenefit. AlthoughLDA users has limited affects.
dominatesmixtureofunigramsonnormaltexts,itissome-
|     |     |     |     |     |     | 5.2 EvaluationonQuestionCollection |     |     |     |     |     |     |
| --- | --- | --- | --- | --- | --- | ---------------------------------- | --- | --- | --- | --- | --- | --- |
howsurprisingthattheperformanceofmixtureofunigrams
outperforms LDA and LDA-U substantially in this short Inordertodemonstratetheeffectivenessofourapproach
| text collection. |     | It suggests | that | the data | sparsity problem |                        |     |     |              |     |               |       |
| ---------------- | --- | ----------- | ---- | -------- | ---------------- | ---------------------- | --- | --- | ------------ | --- | ------------- | ----- |
|                  |     |             |      |          |                  | is domain-independent, |     |     | we evaluated |     | it on another | short |
seriouslyaffectsLDAandLDA-U,whilelessinfluencesmix- text collection, called Question collection. This collection
tureofunigramsandBTM.However,theHscoreofmixture
|     |     |     |     |     |     | includes | 648,514 | questions | crawled | from | a popular | Chinese |
| --- | --- | --- | --- | --- | --- | -------- | ------- | --------- | ------- | ---- | --------- | ------- |
Q&Awebsite6.
of ungirams is still much worse than BTM. With some fur- Eachquestionhasacategorylabelassigned
ther analysis, we find the average intra-cluster distance of byitsquestioner,makingitconvenientforautomaticevalu-
mixtureofunigramsisextremelylarge,owingtoitspeaked
posterior distribution of P(z|d). In other words, mixture of 6http://zhidao.baidu.com
1451

0.8
0.6
sresu fo noitroporP
0.4
0.2
0
|     |     | 1 2 3 | 4 5 | 6 7 8 | 9 >9 |     |     |     |     |     |     |     |     |     |     |
| --- | --- | ----- | --- | ----- | ---- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
Number of tweets posted
Figure 2: Proportions of users who posted certain Figure 3: Classification performance of BTM, mix-
number of tweets in the Tweets2011 collection. ture of unigrams, and LDA on the Question collec-
tion.
| ation. For       | pre-process,   |          | we removed | stop       | words   | and          | low fre- |     |     |     |     |     |     |     |     |
| ---------------- | -------------- | -------- | ---------- | ---------- | ------- | ------------ | -------- | --- | --- | --- | --- | --- | --- | --- | --- |
| quency           | words (i.e.    | document |            | frequency  | is less | than         | 3). The  |     |     |     |     |     |     |     |     |
| final collection | contains       |          | 189,080    | documents, | 26,565  |              | distinct |     |     |     |     |     |     |     |     |
| words, and       | 35 categories. |          | The        | average    | length  | of documents |          |     |     |     |     |     |     |     |     |
is3.94. Notethatinthiscollection,ourbaselinesdonotin-
cludeLDA-U,sincethereisfewuserswholesubmittedmore
than one question.
| We performed |     | the evaluation |     | based | on document |     | classifi- |     |     |     |     |     |     |     |     |
| ------------ | --- | -------------- | --- | ----- | ----------- | --- | --------- | --- | --- | --- | --- | --- | --- | --- | --- |
cation. Consideringtopicmodelasawayfordimensionality
reduction,whichreducesadocumenttoafixedsetoftopical
P(z|d),
| features        |        | we would | like           | to see          | how accurate |           | and dis- |     |     |     |     |     |     |     |     |
| --------------- | ------ | -------- | -------------- | --------------- | ------------ | --------- | -------- | --- | --- | --- | --- | --- | --- | --- | --- |
| criminative     | of the | topical  | representation |                 | of           | documents | for      |     |     |     |     |     |     |     |     |
| classification. | We     | randomly |                | split documents |              | into      | training |     |     |     |     |     |     |     |     |
and test subsets with the ratio 4 : 1, and classified them Figure 4: Classification performance comparison
bythelinearSVMclassifierLIBLINEAR7.Wereportedthe
withdifferentdataproportionsontheQuestionscol-
| accuracy | on 5-fold | cross | validation | in  | Figure | 3.  |     | lection | (K=40). |     |     |     |     |     |     |
| -------- | --------- | ----- | ---------- | --- | ------ | --- | --- | ------- | ------- | --- | --- | --- | --- | --- | --- |
Fromtheresults,wecanseethatBTMalwaysdominates
| the two                               | baselines. | Moreover, |           | the advantage             |             | of BTM      | be-     |                             |             |          |              |      |          |         |        |
| ------------------------------------- | ---------- | --------- | --------- | ------------------------- | ----------- | ----------- | ------- | --------------------------- | ----------- | -------- | ------------ | ---- | -------- | ------- | ------ |
| comes more                            | notable    | as        | the topic | number                    | K grows.    |             | That is |                             |             |          |              |      |          |         |        |
|                                       |            |           |           |                           |             |             |         | Comparing                   | mixture     | of       | unigrams     | with | BTM,     | we find | BTM    |
| because                               | when the   | number    | of        | topics                    | is small,   | topics      | discov- |                             |             |          |              |      |          |         |        |
|                                       |            |           |           |                           |             |             |         | has stable                  | superiority |          | over mixture | of   | unigrams | no      | matter |
| eredareusuallyverygeneral.            |            |           |           | Insuchcase,ashortdocument |             |             |         |                             |             |          |              |      |          |         |        |
|                                       |            |           |           |                           |             |             |         | of the size                 | of the      | training | data.        |      |          |         |        |
| is more                               | likely to  | belong    | to a      | single                    | topic, thus | the         | perfor- |                             |             |          |              |      |          |         |        |
|                                       |            |           |           |                           |             |             |         | 5.3 EvaluationonNormalTexts |             |          |              |      |          |         |        |
| manceofBTMisclosetomixtureofunigrams. |            |           |           |                           |             | Incontrast, |         |                             |             |          |              |      |          |         |        |
withtheincreaseofthetopicnumberK,wewilllearnmore Inpreviousexperiments,wehavedemonstratedtheeffec-
| specific       | topics.      | However, | mixture   | of          | unigrams       | is unable | to   |                            |             |           |         |                      |               |            |      |
| -------------- | ------------ | -------- | --------- | ----------- | -------------- | --------- | ---- | -------------------------- | ----------- | --------- | ------- | -------------------- | ------------- | ---------- | ---- |
|                |              |          |           |             |                |           |      | tivenessofBTMonshorttexts. |             |           |         | AlthoughweproposeBTM |               |            |      |
| capture        | the multiple | topics   | exhibited |             | in a document. |           | Thus |                            |             |           |         |                      |               |            |      |
|                |              |          |           |             |                |           |      | for the                    | short text  | scenario, | there   | is                   | no limitation | for        | our  |
| the difference | between      |          | BTM       | and mixture | of             | unigrams  | be-  |                            |             |           |         |                      |               |            |      |
|                |              |          |           |             |                |           |      | model to                   | be applied  | on        | normal  | text collections.    |               | Therefore, |      |
| comes larger.  | At           | the same | time,     | a large     | topic          | number    | will |                            |             |           |         |                      |               |            |      |
|                |              |          |           |             |                |           |      | it is also                 | interesting | to        | see how | effective            | is            | BTM on     | nor- |
aggravatethedatasparsityproblemofLDAbyintroducing
|     |     |     |     |     |     |     |     | mal text. | For this | purpose, | we  | compared | BTM | with | LDA, |
| --- | --- | --- | --- | --- | --- | --- | --- | --------- | -------- | -------- | --- | -------- | --- | ---- | ---- |
moreparameters,thusthegapbetweenBTMandLDAalso
|                                 |                                           |     |     |     |                   |     |     | one of most                                        | popular    | topic | models, | on        | a normal | text     | collec- |
| ------------------------------- | ----------------------------------------- | --- | --- | --- | ----------------- | --- | --- | -------------------------------------------------- | ---------- | ----- | ------- | --------- | -------- | -------- | ------- |
| increases.                      | Anotherimportantfindingisthatmixtureofun- |     |     |     |                   |     |     |                                                    |            |       |         |           |          |          |         |
|                                 |                                           |     |     |     |                   |     |     | tion. Theexperimentswerecarriedoutonthe20Newsgroup |            |       |         |           |          |          |         |
| igramsoutperformsLDAallthetime. |                                           |     |     |     | ItsuggeststhatLDA |     |     |                                                    |            |       |         |           |          |          |         |
|                                 |                                           |     |     |     |                   |     |     | collection8,                                       | a standard |       | corpora | including | 18,828   | messages |         |
isnotagoodchoiceforshorttextsduetothedatasparsity harvestedfrom20differentUsenetnewsgroups. Eachnews-
problem. group corresponding to a different topic. Table 9 lists the
Onemaywondertheimpactoftrainingdatasizeonthese names of these newsgroups. For pre-process, we removed
| methods. | Werandomlysampleddifferentproportionofdoc- |       |          |           |       |         |         |                                          |          |     |             |     |       |          |     |
| -------- | ------------------------------------------ | ----- | -------- | --------- | ----- | ------- | ------- | ---------------------------------------- | -------- | --- | ----------- | --- | ----- | -------- | --- |
|          |                                            |       |          |           |       |         |         | stopwordsandwordswithfrequencylessthan3, |          |     |             |     |       | butwith- |     |
| uments,  | from 0.2                                   | to 1, | to train | and test  | these | methods | sep-    |                                          |          |     |             |     |       |          |     |
|          |                                            |       |          |           |       |         |         | out stemming.                            | Finally, |     | 42697 words | are | left. |          |     |
| arately. | The results                                | are   | shown    | in Figure | 4.    | We      | can see |                                          |          |     |             |     |       |          |     |
WedirectlytrainedLDAontheoriginaldocumentswith-
| when the     | size of          | the training |          | data grows, | all     | the methods |       |           |                   |          |              |        |         |          |          |
| ------------ | ---------------- | ------------ | -------- | ----------- | ------- | ----------- | ----- | --------- | ----------------- | -------- | ------------ | ------ | ------- | -------- | -------- |
|              |                  |              |          |             |         |             |       | out any   | other processing. |          | Note         | that   | in BTM, | we need  | to       |
| work better. | However,         |              | both     | BTM and     | mixture | of unigrams |       |           |                   |          |              |        |         |          |          |
|              |                  |              |          |             |         |             |       | extract   | biterms           | from the | collection.  | This   | process | is       | a little |
| achieve      | more improvement |              | than     | LDA.        | LDA     | only get    | close |           |                   |          |              |        |         |          |          |
|              |                  |              |          |             |         |             |       | different | from that         | in       | short texts. | Recall | that    | a biterm | is       |
| to mixture   | of unigrams      |              | on small | training    | data.   | It suggests |       |           |                   |          |              |        |         |          |          |
|              |                  |              |          |             |         |             |       | defined   | as a word-pair    |          | co-occurred  | in     | a short | context. | It is    |
thatincreasingthetrainingdatawillnotovercomethedata
notappropriatetoviewalengthydocumentasasingleshort
sparsityprobleminLDA,sincethedocumentsarestillshort. context, since it may involve a wide range of topics. In or-
7http://www.csie.ntu.edu.tw/˜cjlin/liblinear/ 8http://qwone.com/˜jason/20Newsgroups/
1452

Figure 5: Clustering performance of BTM with different context range thresholds and LDA on the 20
| Newsgroups | collection | (K  | =20). |     |     |     |     |     |     |     |     |     |     |     |     |
| ---------- | ---------- | --- | ----- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
• NormalizedMutualInformation(NMI).LetI(Ω;C)de-
| Table 9: | The newsgroup |     | names | in the | 20  | News- |       |     |        |             |     |         |     |            |     |
| -------- | ------------- | --- | ----- | ------ | --- | ----- | ----- | --- | ------ | ----------- | --- | ------- | --- | ---------- | --- |
|          |               |     |       |        |     |       | notes | the | mutual | information |     | between | the | two parti- |     |
groups collection tionsΩandC,NMIpenalizedI(Ω;C)bytheirentropy
| No. Newsgroup   | Name |     | No. | Newsgroup        |     | Name | H(Ω)   |     | H(C)         |           |     |       |         |          |     |
| --------------- | ---- | --- | --- | ---------------- | --- | ---- | ------ | --- | ------------ | --------- | --- | ----- | ------- | -------- | --- |
|                 |      |     |     |                  |     |      |        | and |              | to avoid  | the | value | biasing | to large |     |
| 1 alt.atheism   |      |     | 11  | rec.sport.hockey |     |      |        |     |              |           |     |       |         |          |     |
|                 |      |     |     |                  |     |      | number |     | of clusters. | Formally: |     |       |         |          |     |
| 2 comp.graphics |      |     | 12  | sci.crypt        |     |      |        |     |              |           |     |       |         |          |     |
I(Ω;C)
| 3 comp.os.ms-windows.misc |     |     | 13  | sci.electronics |     |     |     |     |     |     |     |     |     |     |     |
| ------------------------- | --- | --- | --- | --------------- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
NMI(Ω,C)=
| 4 comp.sys.ibm.pc.hardware |     |     | 14  | sci.med |     |     |     |     |     | [H(Ω)+H(C)]/2 |     |     |     |     |     |
| -------------------------- | --- | --- | --- | ------- | --- | --- | --- | --- | --- | ------------- | --- | --- | --- | --- | --- |
(cid:4)
| 5 comp.sys.mac.hardware |     |     | 15  | sci.space              |     |     |            |             |          |                 | |ωi∩cj| | log      | |ωi||cj| |           |     |
| ----------------------- | --- | --- | --- | ---------------------- | --- | --- | ---------- | ----------- | -------- | --------------- | ------- | -------- | -------- | --------- | --- |
|                         |     |     |     |                        |     |     |            |             |          |                 | i,j     | n        | n|ωi∩cj| |           |     |
| 6 comp.windows.x        |     |     | 16  | soc.religion.christian |     |     |            |             | =        | (cid:4)         |         | (cid:4)  |          |           |     |
|                         |     |     |     |                        |     |     |            |             |          | |ωi|            | |ωi|    |          | |cj|     | |cj| )/2  |     |
| 7 misc.forsale          |     |     | 17  | talk.politics.guns     |     |     |            |             |          | (               | log     | +        | log      |           |     |
|                         |     |     |     |                        |     |     |            |             |          | i n             |         | n        | j n      | n         |     |
| 8 rec.autos             |     |     | 18  | talk.politics.mideast  |     |     |            |             |          |                 |         |          |          |           |     |
|                         |     |     |     |                        |     |     | Note       | that        | NMI      | is 1 for        | perfect | match    | between  | Ω         | and |
| 9 rec.motorcycles       |     |     | 19  | talk.politics.misc     |     |     |            |             |          |                 |         |          |          |           |     |
|                         |     |     |     |                        |     |     | C,         | while       | 0 if the | clustering      | is      | random   | with     | respect   | to  |
| 10 rec.sport.baseball   |     |     | 20  | talk.religion.misc     |     |     |            |             |          |                 |         |          |          |           |     |
|                         |     |     |     |                        |     |     | class      | membership. |          |                 |         |          |          |           |     |
|                         |     |     |     |                        |     |     | • Adjusted |             | Rand     | Index(ARI)[18]. |         | Consider |          | documents |     |
dertoreducemeaninglessandnoisebiterms,thebitermset
|                |               |     |               |          |     |        | clusteringasaseriesofpair-wisedecisions. |     |     |     |     |     |     | Iftwodoc- |     |
| -------------- | ------------- | --- | ------------- | -------- | --- | ------ | ---------------------------------------- | --- | --- | --- | --- | --- | --- | --------- | --- |
| is constructed | by extracting |     | any two words | co-occur |     | within |                                          |     |     |     |     |     |     |           |     |
umentsbothinthesameclassandthesamecluster,or
| a context | window with | range | no larger | than | a predefined |     |     |     |     |     |     |     |     |     |     |
| --------- | ----------- | ----- | --------- | ---- | ------------ | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
bothindifferentclassesanddifferentclusters,thedeci-
| threshold | r in each document. |     |     |     |     |     |                                        |     |                |     |              |     |           |              |     |
| --------- | ------------------- | --- | --- | --- | --- | --- | -------------------------------------- | --- | -------------- | --- | ------------ | --- | --------- | ------------ | --- |
|           |                     |     |     |     |     |     | sionisconsideredtobecorrect,elsefalse. |     |                |     |              |     | Randindex |              |     |
|           |                     |     |     |     |     |     | measures                               |     | the percentage |     | of decisions |     | that      | are correct. |     |
5.3.1 QuantitativeEvaluation
|                  |             |     |            |     |                |     | Adjusted |         | Rand   | index | is the   | corrected-for-chance |       |             | ver- |
| ---------------- | ----------- | --- | ---------- | --- | -------------- | --- | -------- | ------- | ------ | ----- | -------- | -------------------- | ----- | ----------- | ---- |
| For quantitative | evaluation, |     | we compare |     | the clustering |     |          |         |        |       |          |                      |       |             |      |
|                  |             |     |            |     |                |     | sion     | of Rand | index, | whose | expected |                      | value | is 0, while |      |
performanceofBTMandLDA.Documentclusteringevalu- the maximum value is also 1 for exactly match.
ation is a direct way to measure the effectiveness of a topic (cid:4) (cid:11) (cid:12) (cid:4) (cid:11) (cid:12)(cid:4) (cid:11) (cid:12) (cid:11) (cid:12)
|     |     |     |     |     |     |     |     |     |     | |ωi∩cj| | −[  | |ωi| |     | |cj| ]/ | n   |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | ------- | --- | ---- | --- | ------- | --- |
model without depending on any extrinsic methods. For (cid:11)i,j(cid:12) 2(cid:4) i (cid:4)2 j(cid:12)(cid:4)2 2(cid:12)
|     |     |     |     |     |     |     | ARI | =   | (cid:4) |     | (cid:11) | (cid:12) | (cid:11) | (cid:11) | (cid:11) (cid:12) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | ------- | --- | -------- | -------- | -------- | -------- | ----------------- |
document clustering, we take each topic as a cluster, and 1[ |ωi| |cj| ]−[ |ωi| |cj| ]/ n
|                                |     |     |     |                    |     |     |     | 2   | i   | 2 + | j 2 |     | i 2 | j   | 2 2 |
| ------------------------------ | --- | --- | --- | ------------------ | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| assigneachdocumentdtothetopicz |     |     |     | withhighestvalueof |     |     |     |     |     |     |     |     |     |     |     |
conditional probability P(z|d). Note that we do not know The results are shown in Figure 5. On the whole, it is
the optimal context range threshold r ahead, therefore, we clear that BTM outperforms LDA significantly when the
| testeddifferentvaluesofit,andreporttheirresultstogether. |                |         |     |            |            |     |          |       |           | r    |         |           |         |            |      |
| -------------------------------------------------------- | -------------- | ------- | --- | ---------- | ---------- | --- | -------- | ----- | --------- | ---- | ------- | --------- | ------- | ---------- | ---- |
|                                                          |                |         |     |            |            |     | context  | range | threshold | is   | between | 30        | and 60, | suggesting |      |
| We adopt                                                 | three standard | metrics | in  | clustering | evaluation |     |          |       |           |      |         |           |         |            |      |
|                                                          |                |         |     |            |            |     | that BTM | also  | performs  | very | well    | on normal | texts.  | In         | par- |
as follows. Let Ω={ω ,··· ,ω } be the set of outputclus- ticular,wefindwhenr=10,LDAworksbetterthanBTM,
|                |      | 1       | K         |         |        |      |          |      |             |             |     |          |     |        |     |
| -------------- | ---- | ------- | --------- | ------- | ------ | ---- | -------- | ---- | ----------- | ----------- | --- | -------- | --- | ------ | --- |
| ters, and C={c | ,··· | ,c } be | P labeled | classes | of the | doc- |          |      |             |             |     |          |     |        |     |
|                | 1    | P       |           |         |        |      | implying | that | the context | information |     | utilized |     | by BTM | is  |
uments. not enough. As the context range threshold r increases,
| •       |                                         |          |                 |        |           |         | more word                               | co-occurrence |           | patterns                       |        | are included, |             | which     | im-  |
| ------- | --------------------------------------- | -------- | --------------- | ------ | --------- | ------- | --------------------------------------- | ------------- | --------- | ------------------------------ | ------ | ------------- | ----------- | --------- | ---- |
| Purity. | Supposedocumentsineachclustershouldtake |          |                 |        |           |         |                                         |               |           |                                |        |               |             |           |      |
|         |                                         |          |                 |        |           |         | provestheperformanceofBTMsubstantially. |               |           |                                |        |               | However,the |           |      |
| the     | dominant class                          | in       | the cluster.    | Purity | is        | the ac- |                                         |               |           |                                |        |               |             |           |      |
|         |                                         |          |                 |        |           |         | improvement                             | slows         | down      | when                           | the    | context       | range       | threshold |      |
| curacy  | of this assignment                      |          | measured        | by     | counting  | the     |                                         |               |           |                                |        |               |             |           |      |
|         |                                         |          |                 |        |           |         | rincreasesfrom30to60.                   |               |           | Anexplanationforthisbehavioris |        |               |             |           |      |
| number  | of correctly                            | assigned | documents       |        | and       | divides |                                         |               |           |                                |        |               |             |           |      |
|         |                                         |          |                 |        |           |         | that when                               | the           | distance  | between                        | two    | words         | increasing, |           | they |
| by the  | total number                            | of       | test documents. |        | Formally: |         |                                         |               |           |                                |        |               |             |           |      |
|         |                                         |          |                 |        |           |         | might be                                | less          | relevant. | At this                        | point, | the           | assumption  |           | that |
(cid:2)K
|     |              |     | 1   |           |      |     | the two | words | in a biterm | have | the | same | topic | will be | less |
| --- | ------------ | --- | --- | --------- | ---- | --- | ------- | ----- | ----------- | ---- | --- | ---- | ----- | ------- | ---- |
|     | purity(Ω,C)= |     | m   | ax|ω i ∩c | j |. |     |         |       |             |      |     |      |       | r       |      |
n j credible. Moreover, a larger context range threshold will
i=1
|     |     |     |     |     |     |     | generate | much | more | biterms, | which | increases | the | training |     |
| --- | --- | --- | --- | --- | --- | --- | -------- | ---- | ---- | -------- | ----- | --------- | --- | -------- | --- |
Note that when all the documents in each cluster are cost. Therefore, for both effectiveness and efficiency con-
with the same class, purity is highest with value of 1. sideration, the context range threshold r should not be too
Conversely, it is close to 0 for bad clustering. small or too large for normal texts in practice.
1453

Table 10: Topics discovered from the 20 Newsgroup collection by BTM and LDA (K=20). “sim”in the last
column denotes the cosine similarity of the two topics in a row.
BTM LDA sim
1 axmaxg9vb8fa861d9pl1453tgiz axmaxb8fg9va861451d9pl0t3t 0.99
2 godjesuschristchurchbiblepeoplelordchristian godjesusbiblechristianchurchchristchristianspaul 0.95
3 keyencryptionchipclipperkeysgovernmentsystem keyencryptionchipclippergovernmentkeyspublic 0.95
4 windowserverdisplaywidgetsetapplicationxtermfile windowserversetapplicationsundisplayproblemmanager 0.93
5 spaceearthlaunchmissionorbitshuttlesystemsolar spaceearthnasagovtimesystemmissionlaunch 0.91
6 writesarticledoncadavidukwrotecsorg writesarticleuniversityukcacsmichaelmailbrian 0.90
7 ax0dcx145ah34uw7mvscxuw 0dcxahw7mvsp17uwscxair 0.86
8 peopledonfbifirechildrenkoreshgunbatf peoplewritesgunfbifirechildrenarticlekoresh 0.83
9 peopledongodwritesmakegoodpointquestion peoplewritestruedonreligionevidencequestiongod 0.82
10 peoplegovernmentpresidentdonmaketimeamerican presidentgovernmentpeoplestatestatesrightsamerican 0.80
11 diseasemedicalpeoplepatientsdontimewritesgood medicalhealthdiseasedrugstudydrugsmencancer 0.79
12 drivescsimacbitcardapplesystemmonitorproblem windowsdrivedoscardmacsystemapplescsidisk 0.75
13 imagejpegfilegraphicsimagesfilescolordataformat fileimageprogramfilesbitjpegcoloroutputline 0.74
14 mailuniversityinformationfaxinternetlistemail graphicsftpsoftwaredatamailpubcomputer 0.62
15 cardonwritescarsgoodveenginetime carcarsarmenianarmeniansenginemuslimsturkish000 0.62
16 00yearteam10game55playplayersgames20 writesyearplaygamegoodcainsurancescottteamgames 0.61
17 1993healthmennumber10hivaprilstudyhomosexual 10199320150012931130 0.54
18 windowsdosfilesystemfilesrundonospcprogram donpeoplevetimegoodllmakethingsthingdoesn 0.25
19 armenianarmenianspeoplewarmuslimsturkish informationgrouplistbookpostquestionsreadsubject 0.15
20 fileentryoutputprogrambuildlineprintfcharinfo writespricebuysaleproblemcostpowergoodinterested 0.03
5.3.2 QualitativeEvaluation co-occurrence patterns and uses the aggregated patterns in
Herewestudythequalityoftopicsdiscoveredbythetwo the whole corpus. We carried on experiments on two real-
topic models. In practice, a topic model which finds topics world short text collections and one normal text collection.
with good readability and accurately reflecting the topical The results demonstrated that BTM not only can learn
structureofdataispreferred. Table10presentsallthetopics higher quality topics, but also more accurately capture the
learnedbyBTMandLDA,whenthenumberoftopicsisset topics of documents than previous methods. Besides, BTM
to20. Thesetopicsfromthetwomethodsarematchedbased issimpleandeasytoimplement,andalsoscalesupwell. All
cosine similarity using greedy algorithm. For each topic we these benefits makes BTM a practicable choice for content
list its top words ordered by P(w|z). We can see that the analysis on short texts in a wide range of applications.
topics 1-16 in BTM and LDA are very similar. Compari- To the best of our knowledge, we are the first to propose
son Table 9 and Table 10, we find it is easy to identify the atopicmodelforgeneralshorttexts. However,thereisstill
corresponding newsgroup of a topic in topics 1-16, except room to improve our work in the future. For example, we
topic 1 and topic 7. For example, topic 2 is with respect to would like to find more sophisticated way to estimate the
thenewsgroup“soc.religion.christian”. Itsuggeststhatboth distribution P(b|d), which is uniform in the current work
BTMandLDAuncovertheinherenttopicalstructureofthe for simplicity. Moreover, it is also interesting to explore
collection closely. the usage of our model in various real-world applications,
Wealsonotethattopics17-20inTable10areverydiffer- likecontentrecommendation,eventtracking,andshorttexts
entinBTMandLDA.InBTM,wecanstillidentifythattop- retrieval, etc.
ics 17-20 relate to the newsgroups“sci.med”,“comp.os.ms-
7. ACKNOWLEDGEMENTS
windows.misc”,“talk.politics.mideast”,“comp.os.ms-window-
s.misc”respectively. ButinLDA,topic17isaboutnumeral, ThisworkisfundedbytheNationalNaturalScienceFoun-
topic 18 is a set of common words, while topics 19 and dation of China under Grant No. 61202213, 61203298, No.
20 are with poor interpretability. In our view, the differ- 60933005,No. 61173008,No. 61003166,and973Programof
ences between the results of the two models are caused by China under Grants No. 2012CB316303. We would like to
the following reasons. BTM explicitly model the word co- thanktheanonymousreviewersfortheirhelpfulcomments.
occurrencesinlocalcontext,itwellcapturestheshort-range
dependenciesbetweenwords. Conversely,LDAcapturesthe 8. REFERENCES
long-range dependencies in documents [11], which are less [1] A. Asuncion, M. Welling, P. Smyth, and Y. Teh. On
specificthanshort-rangeones,resultinginthelastfourtop- smoothing and inference for topic models. In In
ics more common but less readable. Proceedings of the 25th Conference on UAI, 2009.
[2] D. Blei and J. McAuliffe. Supervised topic models. In
6. CONCLUSION&FUTUREWORKS J. Platt, D. Koller, Y. Singer, and S. Roweis, editors,
Topic modeling for short texts is an increasingly impor- Advances in Neural Information Processing Systems
tant task due to the prevalence of short texts on the Web. 20, pages 121–128. MIT Press, Cambridge, MA, 2008.
Compared to normal documents, short texts lack of word [3] D. Blei, A. Ng, and M. Jordan. Latent dirichlet
frequency and context information, causing severe sparsity allocation. The Journal of Machine Learning
problems for conventional topic models. In this paper, we Research, 3:993–1022,2003.
propose a novel probabilistic topic model for short texts, [4] I. Bordino, C. Castillo, D. Donato, and A. Gionis.
namely biterm topic model (BTM). BTM can well capture Query similarity by projecting the query-flow graph.
thetopicswithinshorttextsasitexplicitlymodelstheword In SIGIR, pages 515–522. ACM, 2010.
1454

[5] J. Boyd-Graber and D. M. Blei. Syntactic topic [22] D. Newman, E. V. Bonilla, and W. Buntine.
models. Technical Report arXiv:1002.4665,Feb 2010. Improving topic coherence with regularized topic
[6] J. Boyd-Graber, J. Chang, S. Gerrish, C. Wang, and models. In Advances in Neural Information Processing
D. Blei. Reading tea leaves: How humans interpret Systems 24, pages 496–504. 2011.
topic models. In NIPS, 2009. [23] K. Nigam, A. McCallum, S. Thrun, and T. Mitchell.
[7] D. Cai, Q. Mei, J. Han, and C. Zhai. Modeling hidden Text classification from labeled and unlabeled
topics on document manifold. In Proceedings of the documentsusingem.Machine learning,39(2):103–134,
| 17th | ACM | conference | on  | Information | and | knowledge | 2000. |     |     |     |     |     |     |
| ---- | --- | ---------- | --- | ----------- | --- | --------- | ----- | --- | --- | --- | --- | --- | --- |
management, pages 911–920. ACM, 2008. [24] X. Phan, L. Nguyen, and S. Horiguchi. Learning to
[8] J. Chen, R. Nairn, L. Nelson, M. Bernstein, and classify short and sparse text & web with hidden
E. Chi. Short and tweet: experiments on topics from large-scale data collections. In Proceedings
recommending content from information streams. In of the 17th international conference on World Wide
Proceedings of the 28th international conference on Web, pages 91–100. ACM, 2008.
Human factors in computing systems, pages [25] O. Phelan, K. McCarthy, and B. Smyth. Using twitter
1185–1194.ACM, 2010. torecommendreal-timetopicalnews.InProceedingsof
|                    |              |     |          |            |                 |           | the   | third ACM | conference |       | on Recommender |      | systems,   |
| ------------------ | ------------ | --- | -------- | ---------- | --------------- | --------- | ----- | --------- | ---------- | ----- | -------------- | ---- | ---------- |
| [9] S. Deerwester, |              | S.  | Dumais,  | G. Furnas, | T.              | Landauer, |       |           |            |       |                |      |            |
|                    |              |     |          |            |                 |           | pages | 385–388,  | New        | York, | NY,            | USA, | 2009. ACM. |
| and                | R. Harshman. |     | Indexing | by         | latent semantic |           |       |           |            |       |                |      |            |
analysis. Journal of the American society for [26] D. Ramage, S. Dumais, and D. Liebling.
information science, 41(6):391–407,1990. Characterizing microblogs with topic models. In
[10] T. Griffiths and M. Steyvers. Finding scientific topics. International AAAI Conference on Weblogs and Social
Proceedings of the National Academy of Sciences of Media, volume 5, pages 130–137, 2010.
the United States of America, 101(Suppl1):5228–5235, [27] M. Rosen-Zvi, T. Griffiths, M. Steyvers, and
| 2004.              |     |              |     |          |        |            | P. Smyth.  |     | The author-topicmodel |       |     | for | authors and |
| ------------------ | --- | ------------ | --- | -------- | ------ | ---------- | ---------- | --- | --------------------- | ----- | --- | --- | ----------- |
|                    |     |              |     |          |        |            | documents. |     | In UAI,               | 2004. |     |     |             |
| [11] T. Griffiths, |     | M. Steyvers, |     | D. Blei, | and J. | Tenenbaum. |            |     |                       |       |     |     |             |
Integratingtopicsandsyntax.NIPS,17:537–544,2005. [28] M. Sahami and T. Heilman. A web-based kernel
[12] A. Gruber, M. Rosen-Zvi, and Y. Weiss. Hidden topic function for measuring the similarity of short text
markov models. Artificial Intelligence and Statistics snippets. In Proceedings of the 15th international
(AISTATS), 2007. conference on World Wide Web, pages377–386.ACM,
2006.
| [13] J. Guo, | X.          | Cheng, | G. Xu,      | and | X. Zhu.     | Intent-aware |            |      |       |         |       |         |                 |
| ------------ | ----------- | ------ | ----------- | --- | ----------- | ------------ | ---------- | ---- | ----- | ------- | ----- | ------- | --------------- |
|              |             |        |             |     |             |              | [29] Y. W. | Teh, | M. I. | Jordan, | M. J. | Beal,   | and D. M. Blei. |
| query        | similarity. | In     | Proceedings |     | of the 20th | ACM          |            |      |       |         |       |         |                 |
|              |             |        |             |     |             |              |            |      |       |         |       | Journal | of the          |
international conference on Information and Hierarchical dirichlet processes.
knowledge management, pages 259–268. ACM, 2011. American Statistical Association, 101, 2004.
[14] J. Guo, G. Xu, X. Cheng, and H. Li. Named entity [30] X. Wang and A. McCallum. Topics over time: a
recognition in query. In SIGIR, pages 267–274. ACM, non-markov continuous-timemodel of topical trends.
| 2009.             |     |           |            |     |          |           | In Proceedings |     | of            | the 12th | ACM    | SIGKDD, | pages   |
| ----------------- | --- | --------- | ---------- | --- | -------- | --------- | -------------- | --- | ------------- | -------- | ------ | ------- | ------- |
|                   |     |           |            |     |          |           | 424–433,       | New | York,         | NY,      | USA,   | 2006.   | ACM.    |
| [15] G. Heinrich. |     | Parameter | estimation |     | for text | analysis. |                |     |               |          |        |         |         |
|                   |     |           |            |     |          |           | [31] Y. Wang,  |     | E. Agichtein, |          | and M. | Benzi.  | Tm-lda: |
| Technical         |     | report,   | 2005.      |     |          |           |                |     |               |          |        |         |         |
[16] T.Hofmann.Probabilisticlatentsemanticindexing.In efficient online modeling of latent topic transitions in
SIGIR, pages 50–57. ACM, 1999. social media. In Proceedings of the 18th ACM
[17] L. Hong and B. Davison. Empirical study of topic SIGKDD, pages 123–131, New York, NY, USA, 2012.
| modeling       | in    | twitter.        | In Proceedings |                    | of the      | First  | ACM.          |                 |        |             |                          |               |              |
| -------------- | ----- | --------------- | -------------- | ------------------ | ----------- | ------ | ------------- | --------------- | ------ | ----------- | ------------------------ | ------------- | ------------ |
|                |       |                 |                |                    |             |        | [32] J. Weng, | E.              | Lim,   | J. Jiang,   | and                      | Q. He.        | Twitterrank: |
| Workshop       |       | on Social       | Media          | Analytics,         | pages       | 80–88. |               |                 |        |             |                          |               |              |
|                |       |                 |                |                    |             |        | finding       | topic-sensitive |        | influential |                          | twitterers.   | In           |
| ACM,           | 2010. |                 |                |                    |             |        |               |                 |        |             |                          |               |              |
|                |       |                 |                |                    |             |        | Proceedings   |                 | of the | third       | ACM                      | international | conference   |
| [18] L. Hubert |       | and P.          | Arabie.        | Comparing          | partitions. |        |               |                 |        |             |                          |               |              |
|                |       |                 |                |                    |             |        | on Web        | search          | and    | data        | mining,pages261–270.ACM, |               |              |
| Journal        | of    | classification, |                | 2(1):193–218,1985. |             |        |               |                 |        |             |                          |               |              |
2010.
| [19] O. Jin, | N.  | Liu, K. | Zhao, | Y. Yu, | and Q. | Yang. |     |     |     |     |     |     |     |
| ------------ | --- | ------- | ----- | ------ | ------ | ----- | --- | --- | --- | --- | --- | --- | --- |
Transferring topical knowledge from auxiliary long [33] X. Yan, J. Guo, S. Liu, X. Cheng, and Y. Wang.
texts for short text clustering. In Proceedings of the Learning topics in short texts by non-negative matrix
|      |           |               |     |            |                |      | factorization |         | on term | correlation |               | matrix. | In            |
| ---- | --------- | ------------- | --- | ---------- | -------------- | ---- | ------------- | ------- | ------- | ----------- | ------------- | ------- | ------------- |
| 20th | ACM       | international |     | conference | on Information |      |               |         |         |             |               |         |               |
|      |           |               |     |            |                |      | Proceedings   |         | of the  | SIAM        | International |         | Conference on |
| and  | knowledge | management,   |     | pages      | 775–784.       | ACM, |               |         |         |             |               |         |               |
|      |           |               |     |            |                |      | Data          | Mining. | SIAM,   | 2013.       |               |         |               |
2011.
|            |      |          |         |     |         |        | [34] X. Yan, | J.  | Guo, S. | Liu, X.-q. | Cheng, |     | and Y. Wang. |
| ---------- | ---- | -------- | ------- | --- | ------- | ------ | ------------ | --- | ------- | ---------- | ------ | --- | ------------ |
| [20] C. X. | Lin, | B. Zhao, | Q. Mei, | and | J. Han. | Pet: a |              |     |         |            |        |     |              |
statistical model for popular events tracking in social Clustering short text using ncut-weighted
communities. In Proceedings of the 16th ACM non-negative matrix factorization. In Proceedings of
SIGKDD, pages 929–938. ACM, 2010. the 20th ACM international conference on
|                |             |             |          |                           |              |              | Information   |        | and knowledge  |          | management, |                 | pages        |
| -------------- | ----------- | ----------- | -------- | ------------------------- | ------------ | ------------ | ------------- | ------ | -------------- | -------- | ----------- | --------------- | ------------ |
| [21] D. Mimno, |             | H. Wallach, | E.       | Talley,                   | M. Leenders, | and          |               |        |                |          |             |                 |              |
|                |             |             |          |                           |              |              | 2259–2262,New |        | York,          | NY,      | USA,        | 2012.           | ACM.         |
| A. McCallum.   |             | Optimizing  |          | semantic                  | coherence    | in topic     |               |        |                |          |             |                 |              |
|                |             |             |          |                           |              |              | [35] W.       | Zhao,  | J. Jiang,      | J. Weng, | J.          | He, E.          | Lim, H. Yan, |
| models.        | In          | Proceedings | of       | the Conference            |              | on Empirical |               |        |                |          |             |                 |              |
|                |             |             |          |                           |              |              | and           | X. Li. | Comparing      | twitter  |             | and traditional | media        |
| Methods        | in          | Natural     | Language | Processing,               |              | pages        |               |        |                |          |             |                 |              |
|                |             |             |          |                           |              |              | using         | topic  | models.        | Advances | in          | Information     |              |
| 262–272.       | Association |             | for      | ComputationalLinguistics, |              |              |               |        |                |          |             |                 |              |
|                |             |             |          |                           |              |              | Retrieval,    |        | pages 338–349, |          | 2011.       |                 |              |
2011.
1455