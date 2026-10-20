|     |     |          | Can | You        | Unpack |                      | That? |     |     |     |     |     |
| --- | --- | -------- | --- | ---------- | ------ | -------------------- | ----- | --- | --- | --- | --- | --- |
|     |     | Learning |     | to Rewrite |        | Questions-in-Context |       |     |     |     |     |     |
AhmedElgohary,DenisPeskov,JordanBoyd-Graber∗
DepartmentofComputerScience, UMIACS,iSchool,LanguageScienceCenter
UniversityofMaryland,CollegePark
|     |     | {elgohary, |     | dpeskov, |     |     | jbg}@cs.umd.edu |     |     |     |     |     |
| --- | --- | ---------- | --- | -------- | --- | --- | --------------- | --- | --- | --- | --- | --- |
Abstract
Question Rewriting
| Question | answering | is an | AI-complete | prob- |     |     |     |     |     |     |     |     |
| -------- | --------- | ----- | ----------- | ----- | --- | --- | --- | --- | --- | --- | --- | --- |
lem, but existing datasets lack key elements What happened to Anna
|     |     |     |     |     |     | Q1: | What happened in 1983? |     |     |     |     |     |
| --- | --- | --- | --- | --- | --- | --- | ---------------------- | --- | --- | --- | --- | --- |
Vissi in 1983?
oflanguageunderstandingsuchascoreference
| and ellipsis | resolution. |     | We consider | sequen- |     |     |     |     |     |     |     |     |
| ------------ | ----------- | --- | ----------- | ------- | --- | --- | --- | --- | --- | --- | --- | --- |
A1: In May 1983, she marries Nikos Karvelas, a composer
tialquestionanswering:multiplequestionsare
asked one-by-one in a conversation between Did  Anna Vissi and
Did they have any
a questioner and an answerer. Answering Q2: Nikos Karvelas have any
|                 |     |         |                  |     |     |     |     | children? |     | children together?  |     |     |
| --------------- | --- | ------- | ---------------- | --- | --- | --- | --- | --------- | --- | ------------------- | --- | --- |
| these questions |     | is only | possible through |     | un- |     |     |           |     |                     |     |     |
derstanding the conversation history. We in- A2: In November, she gave birth to her daughter Sofia
| troduce | the task | of question-in-context |     | rewrit- |     |     |                         |     |     |                          |     |     |
| ------- | -------- | ---------------------- | --- | ------- | --- | --- | ----------------------- | --- | --- | ------------------------ | --- | --- |
|         |          |                        |     |         |     |     | Did she have any other  |     |     | Did Anna Vissi have any  |     |     |
ing: given the context of a conversation’s his- Q3: other children than her
children?
tory, rewrite a context-dependent into a self- daughter Sofia?
| containedquestionwiththesameanswer. |     |     |     |     | We  |     |     |     |     |     |     |     |
| ----------------------------------- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
A3: I don’t know
| construct,    | CANARD, | a dataset  | of 40,527     | ques-     |     |        |     |                     |     |           |       |         |
| ------------- | ------- | ---------- | ------------- | --------- | --- | ------ | --- | ------------------- | --- | --------- | ----- | ------- |
| tions based   | on      | QUAC (Choi | et al.,       | 2018) and |     |        |     |                     |     |           |       |         |
|               |         |            |               |           |     | Figure | 1:  | Question-in-context |     | rewriting | task. | The in- |
| train Seq2Seq |         | models for | incorporating | con-      |     |        |     |                     |     |           |       |         |
puttoeachstepisaquestiontorewritegiventhedialog
textintostandalonequestions.
|     |     |     |     |     |     | history | which | consists          | of the | dialog | utterances | (ques-      |
| --- | --- | --- | --- | --- | --- | ------- | ----- | ----------------- | ------ | ------ | ---------- | ----------- |
|     |     |     |     |     |     | tions   | and   | answers) produced |        | before | the        | given ques- |
1 Introduction
|     |     |     |     |     |     | tion | is asked. | The output | is  | an equivalent, |     | context- |
| --- | --- | --- | --- | --- | --- | ---- | --------- | ---------- | --- | -------------- | --- | -------- |
independentparaphraseoftheinputquestion.
QuestionAnswering(QA)isanAIcompleteprob-
| lem (Webber, | 1992), | but existing | QA  | datasets | do  |     |     |     |     |     |     |     |
| ------------ | ------ | ------------ | --- | -------- | --- | --- | --- | --- | --- | --- | --- | --- |
notrisetothechallenge: theylackkey prob- questions in an information-seeking dialogs. Un-
NLP
lemslikeanaphoraresolution,coreferencedisam- like MRC, requiresmodelstolinkquestions
CQA
biguation,andellipsisresolution. Thelogicneeded togethertoresolvetheconversationaldependencies
toanswerthesetypesofquestionsrequiresdeeper
|     |     |     |     |     |     | between |     | them: each | question | needs | to  | be under- |
| --- | --- | --- | --- | --- | --- | ------- | --- | ---------- | -------- | ----- | --- | --------- |
NLP understanding that simulates the context in stood in the conversation context. For example,
whichhumansnaturallyanswerquestions. the question “What was he like in that episode?”
Neuraltechniquesquestionansweringhaveim- cannotbeunderstoodwithoutknowingwhat“he”
proved(Devlinetal.,2018)machinereadingcom- and“thatepisode”referto,whichcanberesolved
prehension(Rajpurkaretal.,2016,MRC): comput- usingtheconversationcontext.
erscantakeasinglequestionandextractanswers Wereducechallenging,interconnectedCQAex-
| fromdatasetslikeWikipedia. |     |     | However,QAmodels |     |     |        |     |              |             |     |     |         |
| -------------------------- | --- | --- | ---------------- | --- | --- | ------ | --- | ------------ | ----------- | --- | --- | ------- |
|                            |     |     |                  |     |     | amples | to  | independent, | stand-alone |     | MRC | to cre- |
struggletogeneralizewhenquestionsdonotlook ate CANARD—Context Abstraction: Necessary
like the standalone questions systems in training Additional Rewritten Discourse—a new dataset1
data: e.g.,newgenres,languages,orclosely-related thatrewrites QUAC (Choietal.,2018)questions.
tasks(Yogatamaetal.,2019). Wecrowdsourcecontext-independentparaphrases
Conversationalquestionanswering(Reddyetal., ofQUACquestionsandusetheparaphrasestotrain
2019, CQA) is a generalization that ask multiple andevaluatequestion-in-contextrewriting.
| ∗ NowatGoogleAIZürich |     |     |     |     |     |     | 1http://canard.qanta.org |     |     |     |     |     |
| --------------------- | --- | --- | --- | --- | --- | --- | ------------------------ | --- | --- | --- | --- | --- |
5918
Proceedingsofthe2019ConferenceonEmpiricalMethodsinNaturalLanguageProcessing
andthe9thInternationalJointConferenceonNaturalLanguageProcessing,pages5918–5924,
HongKong,China,November3–7,2019.(cid:13)c2019AssociationforComputationalLinguistics

|                |     |     |       |     | tion answering | dataset | about | specific Wikipedia |     |
| -------------- | --- | --- | ----- | --- | -------------- | ------- | ----- | ------------------ | --- |
| Characteristic |     |     | Ratio |     |                |         |       |                    |     |
AnswerNotReferenced 0.98 sections. QUACusesapairofworkers—a“student”
anda“teacher”—toaskandrespondtoquestions.
| QuestionMeaningUnchanged |     |     | 0.95 |     |     |     |     |     |     |
| ------------------------ | --- | --- | ---- | --- | --- | --- | --- | --- | --- |
The“student”asksquestionsaboutatopicbased
| CorrectCoreferences |     |     | 1.0 |     |     |     |     |     |     |
| ------------------- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
GrammaticalEnglish 1.0 on only the title of the Wikpedia article and the
Understandablew/oContext 0.90 titleofthetargetsection. The“teacher”hasaccess
tothefullWikipediasectionandprovidesanswers
Table 1: Manual inspection of 50 rewritten context- by selecting text that answers the question. With
independentquestionsfromCANARDsuggeststhatthe this methodology, QUAC gathers 98k questions
newquestionshaveenoughcontexttobeindependently across13,594conversations. Wetaketheirentire
| understandable. |     |     |     |     | devsetandasampleoftheirtrainsetandcreatea |     |     |     |     |
| --------------- | --- | --- | --- | --- | ----------------------------------------- | --- | --- | --- | --- |
customJavaScripttaskinMechanicalTurkthatal-
Section2formallydefinesthetaskofquestion lowsworkerstorewritethesequestions. JavaScript
hintshelptraintheusersandprovidesautomated,
| de-contextualization. |     | Section | 3 constructs | CA- |     |     |     |     |     |
| --------------------- | --- | ------- | ------------ | --- | --- | --- | --- | --- | --- |
real-timefeedback.
| NARD, | a new dataset | of question-in-context |     | with |     |     |     |     |     |
| ----- | ------------- | ---------------------- | --- | ---- | --- | --- | --- | --- | --- |
corresponding context-independent paraphrases. We provide workers with a comprehensive set
Section 5 analyzes our rewrites (and the under- of instructions and task examples. We ask them
lying methodology) to understand the linguistic to rewrite the questions in natural sounding En-
phenomenathatmakeCQAdifficult. Webuildsev- glishwhilepreservingthesentencestructureofthe
eralbaselinerewritingmodelsandcomparetheir originalquestion. Wediscourageworkersfromin-
BLEUscorestoourhumanrewritesinSection4. troducingnewwordsthatareunmentionedinthe
previousutterancesandaskthemtocopyphrases
2 DefiningQuestion-In-ContextRewrites
|     |     |     |     |     | whenappropriatefromtheoriginalquestion. |        |                   |            | These   |
| --- | --- | --- | --- | --- | --------------------------------------- | ------ | ----------------- | ---------- | ------- |
|     |     |     |     |     | instructions                            | ensure | that the rewrites | only       | resolve |
|     |     |     |     |     | conversation-dependentambiguities.      |        |                   | Thus,ween- |         |
Weformallydefinethetaskofquestion-in-context
|                                  |     |     |                 |      | courage                            | workers to | create minimal | edits;  | in Sec- |
| -------------------------------- | --- | --- | --------------- | ---- | ---------------------------------- | ---------- | -------------- | ------- | ------- |
| rewriting(de-contextualization). |     |     | Givenaconversa- |      |                                    |            |                |         |         |
|                                  |     |     |                 |      | tion5.2,wetakeadvantageofthistouse |            |                | BLEUfor |         |
| tiontopictandahistoryH           |     |     | ofm−1turns,     | each |                                    |            |                |         |         |
evaluatingmodel-generatedrewrites.
| turnk isaquestionq |     | andananswera | ;thetaskis |     |     |     |     |     |     |
| ------------------ | --- | ------------ | ---------- | --- | --- | --- | --- | --- | --- |
|                    |     | i            | i          |     |     |     |     |     |     |
togeneratearewriteq′ forthenextquestionq Wedisplaythequestionsintheconversationone
|     |     | m   |     | m   |     |     |     |     |     |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
basedonH. Sinceq ispartoftheconversation, atatime,sincetherewritesshouldincludeonlythe
m
its meaning often involves references to parts of previousutterance. Afterarewritetothequestionis
|                      |     | Avalidrewriteq′ |          |     | submitted,theanswertothequestionisdisplayed. |     |     |     |     |
| -------------------- | --- | --------------- | -------- | --- | -------------------------------------------- | --- | --- | --- | --- |
| itsprecedinghistory. |     |                 | shouldbe |     |                                              |     |     |     |     |
m
self-contained: acorrectanswertoq′ byitselfisa Thenextquestionisthendisplayed. Thisrepeats
m
correctanswertoq combinedwiththequestion’s until the end of the conversation. The full set of
m
|     |     |     |     |     | instructions | and the | data collection | interface | are |
| --- | --- | --- | --- | --- | ------------ | ------- | --------------- | --------- | --- |
precedinghistoryH.
| Figure1showstheassumptionsofCQAandhow |     |     |     |     | providedintheappendix. |     |     |     |     |
| ------------------------------------- | --- | --- | --- | --- | ---------------------- | --- | --- | --- | --- |
theyaremadeexplicitinrewrites. Thefirstques- Weapplyqualitycontrolthroughoutourcollec-
tion omits the title of the page (Anna Vissi), the tion process. During the task, JavaScript checks
secondquestionomitstheanswertothefirstques- automaticallymonitorandwarnaboutcommoner-
tion (replacing both Anna Vissi and her husband rors: submissions that are abnormally short (e.g.,
withthepronoun“they”),andthelastquestionadds ‘why’),rewritesthatstillhavepronouns(e.g.,‘he
ascalarimplicaturethatmustberesolved. wrotethisalbum’),orambiguouswords(e.g.,‘this
|     |     |     |     |     | article’,‘that’). | ManyQUACquestionsaskabout |     |     |     |
| --- | --- | --- | --- | --- | ----------------- | ------------------------- | --- | --- | --- |
3 DatasetConstruction
‘what/whoelse’oraskfor‘other’or‘another’en-
|     |     |     |     |     | tity. Forthatclassofquestions,weaskworkersto |     |     |     |     |
| --- | --- | --- | --- | --- | -------------------------------------------- | --- | --- | --- | --- |
Weelicitparaphrasesfromhumancrowdworkers
to make previously context-dependent questions useaphrasesuchas‘otherthan’,‘inadditionto’,
|                          |     |     |                     |     | ‘aside from’, | ‘besides’, | ‘together | with’ or | ‘along |
| ------------------------ | --- | --- | ------------------- | --- | ------------- | ---------- | --------- | -------- | ------ |
| unambiguouslyanswerable. |     |     | Throughthisprocess, |     |               |            |           |          |        |
with’withtheappropriatecontextintheirrewrite.
| we resolve | difficult | coreference | linkages | and cre- |     |     |     |     |     |
| ---------- | --------- | ----------- | -------- | -------- | --- | --- | --- | --- | --- |
ate a pair-wise mapping between ambiguous and We gather and review our data in batches to
context-enriched questions. We derive screenpotentiallycompromiseddataorlowquality
CANARD
from QUAC (Choietal.,2018),asequentialques- workers. Apost-processingscriptflagssuspicious
5919

| ORIGINAL:                           | Was | this | an  | honest mistake | by  |     |                |     |     | Dev   | Test  |     |
| ----------------------------------- | --- | ---- | --- | -------------- | --- | --- | -------------- | --- | --- | ----- | ----- | --- |
| themedia?                           |     |      |     |                |     |     | Copy           |     |     | 33.84 | 36.25 |     |
| REWRITE:Wastheclaimofmediaregarding |     |      |     |                |     |     | PronounSub     |     |     | 47.72 | 47.44 |     |
| Leblanc’sroomcometotrue?            |     |      |     |                |     |     | Seq2Seq        |     |     | 51.37 | 49.67 |     |
| ORIGINAL:Whatwasasinglefromtheiral- |     |      |     |                |     |     | HumanRewrites* |     |     | 59.92 |       |     |
bum?
REWRITE:Whatwasasinglefromhorslips’ Table3: BLEU scoresofthebaselinemodelsondevel-
| album? |     |     |     |     |     | opment | and | test data. | Seq2Seq | improves |     | up to four |
| ------ | --- | --- | --- | --- | --- | ------ | --- | ---------- | ------- | -------- | --- | ---------- |
pointsovernaivebaselinesbutstillwellbelowhuman
ORIGINAL:Didtheymarry?
|     |     |     |     |     |     | accuracy. |     | Human accuracy |     | (*) is | computed | from a |
| --- | --- | --- | --- | --- | --- | --------- | --- | -------------- | --- | ------ | -------- | ------ |
REWRITE:DidHannahArendtandHeideg-
smallsubsetofthevalidationset.
germarry?
| Table 2:                   | Not all rewrites |     | correctly | encode              | the context | 4   | Baselines |     |     |     |     |     |
| -------------------------- | ---------------- | --- | --------- | ------------------- | ----------- | --- | --------- | --- | --- | --- | --- | --- |
| requiredtoansweraquestion. |                  |     |           | Wetaketwofailuresto |             |     |           |     |     |     |     |     |
provideexamplesofthetwocommonissues: Changed Wecomparethreebaselinemodelsforthequestion-
Meaning (top) and Needs Context (middle). We pro- in-context rewriting task. In the Copy baseline,
| vide an example |     | with no | issues | (bottom) | for compari- |     |         |           |       |          |     |           |
| --------------- | --- | ------- | ------ | -------- | ------------ | --- | ------- | --------- | ----- | -------- | --- | --------- |
|                 |     |         |        |          |              | the | rewrite | q′ is set | to be | the same | as  | the input |
m
son.
|     |     |     |     |     |     | questionq |     | m withoutmakinganychanges. |     |     |     |     |
| --- | --- | --- | --- | --- | --- | --------- | --- | -------------------------- | --- | --- | --- | --- |
WealsotryaPronounSubstitutionbaselinein
|     |     |     |     |     |     | whichthefirstpronouninq |     |     |     | isreplacedwiththe |     |     |
| --- | --- | --- | --- | --- | --- | ----------------------- | --- | --- | --- | ----------------- | --- | --- |
m
rewritesandworkerswhotakeandabnormallylong topicentityoftheconversation. Weusethetitleof
orshorttime. Weflagabout15%ofourdata. Ev- thecorrespondingWikipediaarticletotheoriginal
eryflaggedquestionismanuallyreviewedbyone QUAC conversationasthetopicentity. Similarto
oftheauthorsandanentire HITisdiscardedifone theCopybaseline,thetrainingdataisnotusedin
| isdeemedinadequate. |     |     | Wereject19.9%ofsubmis- |     |     | thatbaseline. |     |     |     |     |     |     |
| ------------------- | --- | --- | ---------------------- | --- | --- | ------------- | --- | --- | --- | --- | --- | --- |
sionsandtherestcompriseCANARD. Additionally, Unlikethepreviousbaselineswhichdonotuse
we filter out under-performing workers based on our rewrites as training data, the third baseline is
theserejectionsfromsubsequentbatches. Tomin- a neural sequence-to-sequence (Seq2Seq) model
imize risk, we limit the initial pool of workers to with attention and a copy mechanism (Bahdanau
thosethathavecompleted500 HITswithover90% et al., 2015; See et al., 2017). We construct the
accuracyandoffercompetitivepaymentof$0.50 inputsequencebyconcatenatingallutterancesin
| per HIT. |     |     |     |     |     | thehistoryH,prependingthemtoq |     |     |     |     | ,andaddinga |     |
| -------- | --- | --- | --- | --- | --- | ----------------------------- | --- | --- | --- | --- | ----------- | --- |
m
|           |     |          |     |             |         | specialseparatortokenbetweenutterances. |     |     |                          |     |     | Weuse |
| --------- | --- | -------- | --- | ----------- | ------- | --------------------------------------- | --- | --- | ------------------------ | --- | --- | ----- |
| We verify | the | efficacy | of  | our quality | control |                                         |     |     |                          |     |     |       |
|           |     |          |     |             |         | abidirectional                          |     |     | encoder-decodermodelwith |     |     |       |
LSTM
| throughmanualreview. |     |     | Arandomsampleoffifty |     |     |     |     |     |     |     |     |     |
| -------------------- | --- | --- | -------------------- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
sharedthewordembeddingsbetweentheencoder
| questions | sampled | from | the | final dataset | is re- |     |     |     |     |     |     |     |
| --------- | ------- | ---- | --- | ------------- | ------ | --- | --- | --- | --- | --- | --- | --- |
andthedecoder.2
viewedfordesirablecharacteristicsbyanativeEn-
Sincequestionsarewrittenbyhumans,ahuman
| glishspeakerinTable1.            |     |     | Eachofthepositivetraits |     |         |                                       |     |     |     |     |     |          |
| -------------------------------- | --- | --- | ----------------------- | --- | ------- | ------------------------------------- | --- | --- | --- | --- | --- | -------- |
|                                  |     |     |                         |     |         | rewritesaretheupper-boundforthistask. |     |     |     |     |     | However, |
| occursin90%ormoreofthequestions. |     |     |                         |     | Basedon |                                       |     |     |     |     |     |          |
annotators(especiallycrowdworkers)canbeincon-
oursample,oureditsretaingrammaticality,leave
|     |     |     |     |     |     | sistentordisagree. |     | Toestimatethehumanaccuracy, |     |     |     |     |
| --- | --- | --- | --- | --- | --- | ------------------ | --- | --------------------------- | --- | --- | --- | --- |
thequestionmeaningunchanged,andusepronouns
|                |            |       |            |                |              | we                                  | collect | 100 pairs    | of rewritten |      | questions; | each    |
| -------------- | ---------- | ----- | ---------- | -------------- | ------------ | ----------------------------------- | ------- | ------------ | ------------ | ---- | ---------- | ------- |
| unambiguously. |            | There | are        | rare occasions | where        |                                     |         |              |              |      |            |         |
|                |            |       |            |                |              | pair                                | has     | two rewrites | of the       | same | question   | (in its |
| workers        | use a part | of    | the answer | to             | the question |                                     |         |              |              |      |            |         |
|                |            |       |            |                |              | givencontext)bytwodifferentworkers. |         |              |              |      |            | Wemanu- |
beingrewrittenorwheresomeofthecontextisleft
allyverifythatallrewritesarevalidandthenuse
| ambiguous. | Theseinfrequentmistakesshouldnot |     |     |     |     |     |     |     |     |     |     |     |
| ---------- | -------------------------------- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
thepairofrewritesasahypothesisandareference.
| affectourmodels. |     | Weprovideexamplesoffailures |     |     |     |     |                |     |                         |     |     |     |
| ---------------- | --- | --------------------------- | --- | --- | --- | --- | -------------- | --- | ----------------------- | --- | --- | --- |
|                  |     |                             |     |     |     |     | Table3showsthe |     | BLEUscoresproducedbythe |     |     |     |
inTable2.
baselinesandhumansoverboththevalidationand
We use the rewrites of QUAC’s development the test sets.3 Although a well-trained standard
| set as our | test set | (5,571 | question-in-context |     | and |     |     |     |     |     |     |     |
| ---------- | -------- | ------ | ------------------- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
correspondingrewritepairs)andusea10%sample 2WeinitializetheembeddingswithGloVE(Pennington
etal.,2014)andtrainwithabatch-sizeof16for200000steps.
ofQUAC’strainingsetrewritesasourdevelopment
WeuseOpenNMT(Kleinetal.,2018)implementation.
set(3,418);therestaretrainingdata(31,538). 3Weusemulti-bleu-detok.perl(Sennrichetal.,2017)
5920

|     |     |     |     | Label    |     | Text                   |     |     |     |     |
| --- | --- | --- | --- | -------- | --- | ---------------------- | --- | --- | --- | --- |
| 10  |     |     |     | QUESTION |     | Howlongdidhestaythere? |     |     |     |     |
Average Length
|     |     |     |     | REWRITE |     | How long | did | Cito Gaston | stay | at the |
| --- | --- | --- | --- | ------- | --- | -------- | --- | ----------- | ---- | ------ |
7.5
Jays?
| 5   |     |     |     |     |     | CitoGaston |     |     |     |     |
| --- | --- | --- | --- | --- | --- | ---------- | --- | --- | --- | --- |
Q:WhatdidGastondoaftertheworld
2.5
series?
...
| 0   |     |     |     | HISTORY |     |     |     |     |     |     |
| --- | --- | --- | --- | ------- | --- | --- | --- | --- | --- | --- |
Q:Wheredidhegoin2001?
0.5
A:In2002,hewashiredbytheJaysas
| 0.4 |     |     | Pronoun Ratio |     |     |     |     |     |     |     |
| --- | --- | --- | ------------- | --- | --- | --- | --- | --- | --- | --- |
specialassistanttopresidentandchief
| 0.3 |     |     |     |     |     | executiveofficerPaulGodfrey. |     |     |     |     |
| --- | --- | --- | --- | --- | --- | ---------------------------- | --- | --- | --- | --- |
0.2
| 0.1 |     |     |     | Table 4:           | An example |                                 | that had | over | ten flagged | proper |
| --- | --- | --- | --- | ------------------ | ---------- | ------------------------------- | -------- | ---- | ----------- | ------ |
|     |     |     |     | nounsinthehistory. |            | Rewritingrequiresresolvingchal- |          |      |             |        |
0
| 2.5 |     |     |     | lengingcoreferences. |     |     |     |     |     |     |
| --- | --- | --- | --- | -------------------- | --- | --- | --- | --- | --- | --- |
Proper Noun Ratio
2
1.5
1
|          |                      |     |         | biguousthanthosewithoutany. |          |         |           | Only0.9%ofthese |          |          |
| -------- | -------------------- | --- | ------- | --------------------------- | -------- | ------- | --------- | --------------- | -------- | -------- |
| 0.5      |                      |     |         | have pronouns               |          | that    | span more | than            | one      | category |
| 0        |                      |     |         | (e.g., ‘she’                | and      | ‘his’). | Hence,    |                 | pronouns | within   |
| Original | Pronoun SubReference |     | Seq2Seq |                             |          |         |           |                 |          |          |
|          |                      |     |         | a single                    | sentence | are     | likely    | unambiguous.    |          | How-     |
Figure 2: Human rewrites are longer, have fewer pro- ever,75.0%oftheaggregatehistoryhaspronouns
andthepercentageofmixedcategorypronounsin-
| nouns, and | have more | proper nouns than | the original |     |     |     |     |     |     |     |
| ---------- | --------- | ----------------- | ------------ | --- | --- | --- | --- | --- | --- | --- |
QUAC questions. Rewrites are longer and contain crease to 27.8% of our data. Therefore, pronoun
morepropernounsthanourPronounSubbaselineand
disambiguationpotentiallybecomesaproblemfor
trainedSeq2Seqmodel. aquarteroftheoriginaldata. Anexampleispro-
videdinTable4.
neuralsequence-to-sequenceimproves2–4BLEU Approximately one-third of the questions gen-
|     |     |     |     | erated by | our | pronoun-replacement |     |     | baseline | are |
| --- | --- | --- | --- | --------- | --- | ------------------- | --- | --- | -------- | --- |
pointsovernaivebaselines,itisstill9BLEUpoints
below human-accuracy. We analyze sources of within85%stringsimilaritytoourrewrittenques-
errorsinthefollowingsection. tions. Thatleavestwo-thirdsofourdatathatcannot
besolvedwithpronounresolutionalone.
5 DatasetandModelAnalysis
Weanalyzeourdatasetwithautomaticmetricsafter 5.2 ModelAnalysis
| validatingthereliabilityofourdata(Section3). |     |     | We  |     |     |     |     |     |     |     |
| -------------------------------------------- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
compare our dataset to the original QUAC ques- By manually examining the predictions of the
tionsandtoautomaticallygeneratedquestionsby seq2seqmodel,wenoticethatthemainsourceof
|            |                                  |     |     | errors is | that the | model | tends | to  | find a | short path |
| ---------- | -------------------------------- | --- | --- | --------- | -------- | ----- | ----- | --- | ------ | ---------- |
| ourmodels. | Then,wemanuallyinspectthesources |     |     |           |          |       |       |     |        |            |
ofrewritingerrorsintheseq2seqbaseline. to completing the rewrites. That often results in
|     |     |     |     | under-specified |     | questions |     | as in | Example | 1 in Ta- |
| --- | --- | --- | --- | --------------- | --- | --------- | --- | ----- | ------- | -------- |
5.1 AnaphoraResolutionandCoreference ble5,questionmeaningchangeasinExample2or
meaninglessquestionsasinExample3.
| Our rewrites | are longer, | contain more | nouns and |     |     |     |     |     |     |     |
| ------------ | ----------- | ------------ | --------- | --- | --- | --- | --- | --- | --- | --- |
lesspronouns,andhavemorewordtypesthanthe Anothersourceoferrorsishavingrelatedentities
originaldata. Machineoutputliesinbetweenthe mentionedinthecontextasExample4inTable5,
two human-generated corpora, but quality is dif- where the model confused “Copa America” with
ficult to assess. Figure 2 shows these statistics. “Argentina”. Themodelalsostruggleswithlisting
| We motivate | our rewrites | by exploring | linguistic |     |     |     |     |     |     |     |
| ----------- | ------------ | ------------ | ---------- | --- | --- | --- | --- | --- | --- | --- |
multipleentitiesmentionedindifferentpartsofthe
properties of our data. Anaphora resolution and context. Example 5 in Table 5 show the output
coreference are two core NLP tasks applicable to andthereferencerewritesofthequestion“Didshe
this dataset, in addition to the downstream tasks haveanymoreworksthanthose3?”,wheretwoof
evaluatedinSection4. thethreeentities—“UnitedStatesofBanana”,“La
Pronouns occur in 53.9% of QUAC questions. Comedia”and“Asaltoaltiempo”—arelostinthe
| Questionswithpronounsaremorelikelytobeam- |     |     |     | rewrite. |     |     |     |     |     |     |
| ----------------------------------------- | --- | --- | --- | -------- | --- | --- | --- | --- | --- | --- |
5921

| Seq2Seqoutput |     |     |     |     |     | Reference |     |     |     |     |     |     |     |
| ------------- | --- | --- | --- | --- | --- | --------- | --- | --- | --- | --- | --- | --- | --- |
1 WhatdidChamberlain’smendo? What did Chamberlain’s men do during the Battle of
Gettysburg?
2 HowmanygamesdidOzzieSmithwin? How many games did the Cardinals win while Ozzie
Smithplayed?
3 Did108thgettothefinals? Did the US Women’s Soccer Team get to the finals in
the1999WorldCup?
4 DidGabrielBatistutaresideinanyother Besides Argentina, did Gabriel Batistuta reside in any
| countries, |     | besides | touring | in  | the | Copa othercountries? |     |     |     |     |     |     |     |
| ---------- | --- | ------- | ------- | --- | --- | -------------------- | --- | --- | --- | --- | --- | --- | --- |
America?
5 DidLaComediahaveanymoreworks DidGianninaBraschihaveanymoreworksthanUnited
| thanLaComedia3? |     |     |     |     |     | StatesofBanana,LaComediaandAsaltoaltiempo? |     |     |     |     |     |     |     |
| --------------- | --- | --- | --- | --- | --- | ------------------------------------------ | --- | --- | --- | --- | --- | --- | --- |
Table5: ExampleerroneousrewritesgeneratedbytheSeq2Seqmodelsandtheircorrespondingreferencerewrites.
The dominant source of error is the model tendency to produce short rewrites (Examples 1–3). Related entities
(CopaAmericaandArgentinainExample4)distractthemodel. Themodelstruggleswithlistingmultipleentities
mentionedindifferentpartsofthecontext(Example5).
6 RelatedWorkandDiscussion
|     |     |     |     |     |     |     | vary in | difficulty | (Sugawara |     | et al., | 2018), | exist- |
| --- | --- | --- | --- | --- | --- | --- | ------- | ---------- | --------- | --- | ------- | ------ | ------ |
ingresearcheitherintroducesnewbenchmarksof
| Recent | work | in CQA | has | used simple |     | concatena- |     |     |     |     |     |     |     |
| ------ | ---- | ------ | --- | ----------- | --- | ---------- | --- | --- | --- | --- | --- | --- | --- |
difficult(adversarial)stand-alonequestions(Dua
tion(Elgoharyetal.,2018),sequentialneuralmod-
etal.,2019;Wallaceetal.,2019,interalia),ormod-
els(Huangetal.,2019),andtransformers(Quetal.,
elsthatsimplifyhardquestionsthroughparaphras-
| 2019a) | for modeling |     | the | interaction | between | the |     |     |     |     |     |     |     |
| ------ | ------------ | --- | --- | ----------- | ------- | --- | --- | --- | --- | --- | --- | --- | --- |
ing(Dongetal.,2017)ordecomposition(Talmor
| conversation |                                | history, | the | question | and | reference |                  |     |                         |     |     |     |     |
| ------------ | ------------------------------ | -------- | --- | -------- | --- | --------- | ---------------- | --- | ----------------------- | --- | --- | --- | --- |
|              |                                |          |     |          |     |           | andBerant,2018). |     | WeaimatstudyingQAmodels |     |     |     |     |
| documents.   | Someofthecomponentsinthosemod- |          |     |          |     |           |                  |     |                         |     |     |     |     |
thatcanaskforhumanassistance(feedback)when
els,suchasrelevanthistoryturnselection(Quetal.,
theystruggletoansweraquestion.
2019b),canbeadoptedinquestionrewritingmod-
|         |           |     |             |        |     |            | The     | reading    | comprehension |     | setup | of CQA | pro- |
| ------- | --------- | --- | ----------- | ------ | --- | ---------- | ------- | ---------- | ------------- | --- | ----- | ------ | ---- |
| els for | our task. | An  | interesting | avenue |     | for future |         |            |               |     |       |        |      |
|         |           |     |             |        |     |            | vides a | controlled | environment   |     | where | the    | main |
workistoincorporatedeepercontext,eitherfrom
|                  |     |      |         |       |     |            | source       | of difficulty | is          | interpreting |           | a question | in  |
| ---------------- | --- | ---- | ------- | ----- | --- | ---------- | ------------ | ------------- | ----------- | ------------ | --------- | ---------- | --- |
| other modalities |     | (Das | et al., | 2017) | or  | from other |              |               |             |              |           |            |     |
|                  |     |      |         |       |     |            | its context. | The           | interactive |              | component | of         | CQA |
dialogcomprehensiontasks(Sunetal.,2019).
alsoprovidesanaturalmechanismforimproving
Paralleltoourwork,Rastogietal.(2019)andSu
|     |     |     |     |     |     |     | rewriting. | Whenthecomputercannotunderstand |     |     |     |     |     |
| --- | --- | --- | --- | --- | --- | --- | ---------- | ------------------------------- | --- | --- | --- | --- | --- |
etal.(2019)introduceutterancerewritingdatasets
|                         |     |        |                        |     |              |     | (rewrite)     | a question | because          |     | of complicated |          | con-   |
| ----------------------- | --- | ------ | ---------------------- | --- | ------------ | --- | ------------- | ---------- | ---------------- | --- | -------------- | -------- | ------ |
| fordialogstatetracking. |     |        | Rastogietal.(2019)cov- |     |              |     |               |            |                  |     |                |          |        |
|                         |     |        |                        |     |              |     | text, missing |            | world knowledge, |     | or             | upstream | er-    |
| ers a narrow            |     | set of | domains                | and | the rewrites | of  |               |            |                  |     |                |          |        |
|                         |     |        |                        |     |              |     | rors (Peskov  |            | et al., 2019)    | in  | the course     | of       | a con- |
Suetal.(2019)arebasedonChinesedialogwith
versation,itshouldbeabletoaskitsinterlocutor,
| two-turnfixedhistories. |     |     | Incontrast,CANARDhas |     |     |     |          |        |        |      |         |       |       |
| ----------------------- | --- | --- | -------------------- | --- | --- | --- | -------- | ------ | ------ | ---- | ------- | ----- | ----- |
|                         |     |     |                      |     |     |     | “can you | unpack | that?” | This | dataset | helps | start |
historiesofvariableturnlengths,coverswidertop-
thatconversation;thenextstepsaredevelopingand
ics,andisbasedonCQA.
evaluatingmodelsthatefficientlydecidewhento
Trainingquestionrewritingusingreinforcement
askforhumanassistance,andhowtobestusethis
| learning | with | the task | accuracy |     | as reward | signal |     |     |     |     |     |     |     |
| -------- | ---- | -------- | -------- | --- | --------- | ------ | --- | --- | --- | --- | --- | --- | --- |
assistance.
| isexploredinretrieval-based |               |     |     | QA(Liuetal.,2019) |       |          |                 |     |           |     |          |      |     |
| --------------------------- | ------------- | --- | --- | ----------------- | ----- | -------- | --------------- | --- | --------- | --- | -------- | ---- | --- |
| andinMRC(Bucketal.,2018).   |               |     |     | Anaturalquestion  |       |          | Acknowledgments |     |           |     |          |      |     |
| is whether                  | reinforcement |     |     | learning          | could | learn to |                 |     |           |     |          |      |     |
|                             |               |     |     |                   |       |          | We thank        | Jo  | Shoemaker | and | Michelle | Yuan | for |
retainthenecessarycontexttorewritequestionsin
|                                               |     |     |         |       |         |         | crowdsourcing |      | feedback. | This         | work | was          | sup- |
| --------------------------------------------- | --- | --- | ------- | ----- | ------- | ------- | ------------- | ---- | --------- | ------------ | ---- | ------------ | ---- |
| CQA. However,                                 |     | our | dataset | could | be used | to pre- |               |      |           |              |      |              |      |
|                                               |     |     |         |       |         |         | ported        | by   | grant     | IIS-1822494. |      | Boyd-Graber  |      |
| trainaquestionrewriterthatcanfurtherberefined |     |     |         |       |         |         |               | NSF  |           |              |      |              |      |
|                                               |     |     |         |       |         |         | and Peskov    | were | also      | supported    | by   | IIS-1748663. |      |
usingreinforcementlearning.
More broadly, we hope can drive Anyopinions,findings,conclusions,orrecommen-
CANARD
dationsexpressedherearethoseoftheauthorsand
| human-computer |     | collaboration |     | in  |     | (Feng and |     |     |     |     |     |     |     |
| -------------- | --- | ------------- | --- | --- | --- | --------- | --- | --- | --- | --- | --- | --- | --- |
QA
donotnecessarilyreflecttheviewofthesponsors.
| Boyd-Graber, |     | 2019). | While | questions |     | typically |     |     |     |     |     |     |     |
| ------------ | --- | ------ | ----- | --------- | --- | --------- | --- | --- | --- | --- | --- | --- | --- |
5922

| References |     |     |     |     |     |     | Ye Liu, | Chenwei | Zhang, | Xiaohui    | Yan,     | Yi Chang,  | and |
| ---------- | --- | --- | --- | --- | --- | --- | ------- | ------- | ------ | ---------- | -------- | ---------- | --- |
|            |     |     |     |     |     |     | Philip  | S Yu.   | 2019.  | Generative | question | refinement |     |
DzmitryBahdanau,KyunghyunCho,andYoshuaBen-
|            |          |     |            |             |             |            | with       | deep reinforcement |                | learning       | in     | retrieval-based |          |
| ---------- | -------- | --- | ---------- | ----------- | ----------- | ---------- | ---------- | ------------------ | -------------- | -------------- | ------ | --------------- | -------- |
| gio. 2015. | Neural   |     | machine    | translation |             | by jointly |            |                    |                |                |        |                 |          |
|            |          |     |            |             |             |            | QA system. |                    | In Proceedings |                | of the | ACM             | Interna- |
| learning   | to align | and | translate. | In          | Proceedings | of         |            |                    |                |                |        |                 |          |
|            |          |     |            |             |             |            | tional     | Conference         |                | on Information |        | and Knowledge   |          |
theInternationalConferenceonLearningRepresen-
Management.
tations.
|     |     |     |     |     |     |     | Jeffrey | Pennington, | Richard |     | Socher, | and Christopher |     |
| --- | --- | --- | --- | --- | --- | --- | ------- | ----------- | ------- | --- | ------- | --------------- | --- |
Christian Buck, Jannis Bulian, Massimiliano Cia- Manning. 2014. GloVe: Global vectors for word
ramita,WojciechGajewski,AndreaGesmundo,Neil representation. In Proceedings of Empirical Meth-
| Houlsby, | and | Wei Wang. | 2018. | Ask | the | right ques- |     |     |     |     |     |     |     |
| -------- | --- | --------- | ----- | --- | --- | ----------- | --- | --- | --- | --- | --- | --- | --- |
odsinNaturalLanguageProcessing.
tions: Activequestionreformulationwithreinforce-
| ment learning. |     | In Proceedings |     | of  | the International |     |               |     |         |       |            |     |        |
| -------------- | --- | -------------- | --- | --- | ----------------- | --- | ------------- | --- | ------- | ----- | ---------- | --- | ------ |
|                |     |                |     |     |                   |     | Denis Peskov, | Joe | Barrow, | Pedro | Rodriguez, |     | Graham |
ConferenceonLearningRepresentations.
|             |       |             |     |              |     |     | Neubig,andJordanBoyd-Graber.2019. |               |              |            |            | Mitigating    |          |
| ----------- | ----- | ----------- | --- | ------------ | --- | --- | --------------------------------- | ------------- | ------------ | ---------- | ---------- | ------------- | -------- |
|             |       |             |     |              |     |     | noisy                             | inputs        | for question |            | answering. | In            | Proceed- |
| EunsolChoi, | HeHe, | MohitIyyer, |     | MarkYatskar, |     | Wen |                                   |               |              |            |            |               |          |
|             |       |             |     |              |     |     | ings                              | of the Annual |              | Conference | of the     | International |          |
tau Yih, Yejin Choi, Percy Liang, and Luke Zettle- SpeechCommunicationAssociation.
| moyer. | 2018. | QuAC: | Question | answering |     | in con- |     |     |     |     |     |     |     |
| ------ | ----- | ----- | -------- | --------- | --- | ------- | --- | --- | --- | --- | --- | --- | --- |
text. In Proceedings of Empirical Methods in Nat- Chen Qu, Liu Yang, Minghui Qiu, W. Bruce Croft,
uralLanguageProcessing. Yongfeng Zhang, and Mohit Iyyer. 2019a. BERT
|          |      |        |         |        |        |     | with       | history                        | modeling | for | conversational |     | question |
| -------- | ---- | ------ | ------- | ------ | ------ | --- | ---------- | ------------------------------ | -------- | --- | -------------- | --- | -------- |
| Abhishek | Das, | Satwik | Kottur, | Khushi | Gupta, | Avi |            |                                |          |     |                |     |          |
|          |      |        |         |        |        |     | answering. | InProceedingsoftheACMSIGIRCon- |          |     |                |     |          |
Singh,DeshrajYadav,JoséMFMoura,DeviParikh,
|                     |     |     |               |     |            |     | ference        | on Research |     | and | Development | in  | Informa- |
| ------------------- | --- | --- | ------------- | --- | ---------- | --- | -------------- | ----------- | --- | --- | ----------- | --- | -------- |
| andDhruvBatra.2017. |     |     | Visualdialog. |     | InComputer |     | tionRetrieval. |             |     |     |             |     |          |
VisionandPatternRecognition.
|     |     |     |     |     |     |     | Chen Qu, | Liu | Yang, | Minghui | Qiu, Yongfeng |     | Zhang, |
| --- | --- | --- | --- | --- | --- | --- | -------- | --- | ----- | ------- | ------------- | --- | ------ |
Jacob Devlin, Ming-Wei Chang, Kenton Lee, and CenChen,W.BruceCroft,andMohitIyyer.2019b.
| Kristina           | Toutanova. |              | 2018. | BERT:  | Pre-training | of       |                 |         |           |             |                    |         |        |
| ------------------ | ---------- | ------------ | ----- | ------ | ------------ | -------- | --------------- | ------- | --------- | ----------- | ------------------ | ------- | ------ |
|                    |            |              |       |        |              |          | Attentive       | history | selection |             | for conversational |         | ques-  |
| deep bidirectional |            | transformers |       | for    | language     | under-   |                 |         |           |             |                    |         |        |
|                    |            |              |       |        |              |          | tion answering. |         | In        | Proceedings | of                 | the ACM | Inter- |
| standing.          | In         | Conference   |       | of the | North        | American |                 |         |           |             |                    |         |        |
nationalConferenceonInformationandKnowledge
| Chapter | of the | Association |     | for Computational |     | Lin- | Management. |     |     |     |     |     |     |
| ------- | ------ | ----------- | --- | ----------------- | --- | ---- | ----------- | --- | --- | --- | --- | --- | --- |
guistics.
PranavRajpurkar,JianZhang,KonstantinLopyrev,and
LiDong,JonathanMallinson,SivaReddy,andMirella Percy Liang. 2016. SQuAD: 100,000+ questions
Lapata. 2017. Learning to paraphrase for question formachinecomprehensionoftext. InProceedings
| answering. | InProceedingsofEmpiricalMethodsin |     |     |     |     |     |     |     |     |     |     |     |     |
| ---------- | --------------------------------- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
ofEmpiricalMethodsinNaturalLanguageProcess-
NaturalLanguageProcessing.
ing.
| Dheeru Dua, | Yizhong |     | Wang, | Pradeep | Dasigi, | Gabriel |            |          |       |        |         |       |     |
| ----------- | ------- | --- | ----- | ------- | ------- | ------- | ---------- | -------- | ----- | ------ | ------- | ----- | --- |
|             |         |     |       |         |         |         | Pushpendre | Rastogi, | Arpit | Gupta, | Tongfei | Chen, | and |
Stanovsky, Sameer Singh, and Matt Gardner. 2019. Lambert Mathias. 2019. Scaling multi-domain dia-
DROP:Areadingcomprehensionbenchmarkrequir- loguestatetrackingviaqueryreformulation. InCon-
ing discrete reasoning over paragraphs. In Confer- ferenceoftheNorthAmericanChapteroftheAsso-
enceoftheNorthAmericanChapteroftheAssocia- ciationforComputationalLinguistics.
tionforComputationalLinguistics.
SivaReddy,DanqiChen,andChristopherDManning.
AhmedElgohary,ChenZhao,andJordanBoyd-Graber.
2019. CoQA:Aconversationalquestionanswering
2018. Dataset and baselines for sequential open- challenge. TransactionsoftheAssociationforCom-
| domainquestionanswering. |     |     |     | InProceedingsofEm- |     |     | putationalLinguistics. |     |     |     |     |     |     |
| ------------------------ | --- | --- | --- | ------------------ | --- | --- | ---------------------- | --- | --- | --- | --- | --- | --- |
piricalMethodsinNaturalLanguageProcessing.
AbigailSee,PeterJ.Liu,andChristopherD.Manning.
ShiFengandJordanBoyd-Graber.2019. WhatAIcan 2017. Gettothepoint: Summarizationwithpointer-
do for me: Evaluating machine learning interpreta- generator networks. In Proceedings of the Associa-
tions in cooperative play. In International Confer- tionforComputationalLinguistics.
enceonIntelligentUserInterfaces.
|           |        |        |       |     |     |          | Rico Sennrich, |       | Orhan   | Firat, | Kyunghyun         | Cho, | Alexan- |
| --------- | ------ | ------ | ----- | --- | --- | -------- | -------------- | ----- | ------- | ------ | ----------------- | ---- | ------- |
| Hsin-Yuan | Huang, | Eunsol | Choi, | and | Wen | tau Yih. |                |       |         |        |                   |      |         |
|           |        |        |       |     |     |          | dra Birch,     | Barry | Haddow, |        | Julian Hitschler, |      | Marcin  |
2019. FlowQA:Graspingflowinhistoryforconver- Junczys-Dowmunt,SamuelLäubli,AntonioValerio
sationalmachinecomprehension. InProceedingsof Miceli Barone, Jozef Mokry, and Maria Nadejde.
theInternationalConferenceonLearningRepresen- 2017. Nematus: a toolkit for neural machine trans-
| tations. |     |     |     |     |     |     | lation. | In Proceedings |     | of  | the Software | Demonstra- |     |
| -------- | --- | --- | --- | --- | --- | --- | ------- | -------------- | --- | --- | ------------ | ---------- | --- |
tionsoftheConferenceoftheEuropeanChapterof
| Guillaume | Klein, | Yoon | Kim, | Yuntian | Deng, | Vincent |     |     |     |     |     |     |     |
| --------- | ------ | ---- | ---- | ------- | ----- | ------- | --- | --- | --- | --- | --- | --- | --- |
theAssociationforComputationalLinguistics.
| Nguyen, | Jean | Senellart, | and | Alexander | Rush. | 2018. |     |     |     |     |     |     |     |
| ------- | ---- | ---------- | --- | --------- | ----- | ----- | --- | --- | --- | --- | --- | --- | --- |
OpenNMT: Neural machine translation toolkit. In Hui Su, Xiaoyu Shen, Rongzhi Zhang, Fei Sun, Peng-
ProceedingsofAssociationforMachineTranslation wei Hu, Cheng Niu, and Jie Zhou. 2019. Improv-
intheAmericas. ing multi-turn dialogue modelling with utterance
5923

ReWriter. In Proceedings of the Association for
ComputationalLinguistics.
Saku Sugawara, Kentaro Inui, Satoshi Sekine, and
AkikoAizawa.2018. Whatmakesreadingcompre-
hensionquestionseasier? InProceedingsofEmpiri-
calMethodsinNaturalLanguageProcessing.
Kai Sun, Dian Yu, Jianshu Chen, Dong Yu, Yejin
Choi, and Claire Cardie. 2019. DREAM: A chal-
lengedatasetandmodelsfordialogue-basedreading
comprehension. TransactionsoftheAssociationfor
ComputationalLinguistics.
Alon Talmor and Jonathan Berant. 2018. The web as
aknowledge-baseforansweringcomplexquestions.
InConferenceoftheNorthAmericanChapterofthe
AssociationforComputationalLinguistics.
Eric Wallace, Pedro Rodriguez, Shi Feng, Ikuya Ya-
mada, and Jordan Boyd-Graber. 2019. Trick me if
youcan: Human-in-the-loopgenerationofadversar-
ialquestionansweringexamples. InTransactionsof
theAssociationforComputationalLinguistics.
Bonnie Webber. 1992. Question answering. In Stu-
art C. Shapiro, editor, Encyclopedia of Artificial In-
telligence, 2nd edition, pages 814–822. John Wiley
&Sons,Inc.,NewYork,NY.
DaniYogatama,CypriendeMassond’Autume,Jerome
Connor, Tomás Kociský, Mike Chrzanowski, Ling-
peng Kong, Angeliki Lazaridou, Wang Ling, Lei
Yu, ChrisDyer, andPhil Blunsom.2019. Learning
andevaluatinggenerallinguisticintelligence. arXiv
preprintarXiv:1901.11373.
5924