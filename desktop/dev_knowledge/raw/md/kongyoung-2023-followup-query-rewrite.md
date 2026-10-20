Multi-Task Learning of Query Generation and Classification for
|     |     | Generative | Conversational | Question |     | Rewriting |     |     |     |     |
| --- | --- | ---------- | -------------- | -------- | --- | --------- | --- | --- | --- | --- |
SarawootKongyoung1,CraigMacdonald2,IadhOunis2
UniversityofGlasgow,UK
1s.kongyoung.1@research.gla.ac.uk
2{craig.macdonald,iadh.ounis}@glasgow.ac.uk
Abstract
| In conversational |     | search settings, | users ask |     |     |     |     |     |     |     |
| ----------------- | --- | ---------------- | --------- | --- | --- | --- | --- | --- | --- | --- |
questionsandreceiveanswersaspartofacon-
| versation. | Theambiguityinthequestionsisa |           |                |     |     |     |     |     |     |     |
| ---------- | ----------------------------- | --------- | -------------- | --- | --- | --- | --- | --- | --- | --- |
| common     | challenge,                    | which can | be effectively |     |     |     |     |     |     |     |
addressedbyleveragingcontextualinformation
| fromtheconversationhistory. |     |     | Inthiscontext, |     |     |     |     |     |     |     |
| --------------------------- | --- | --- | -------------- | --- | --- | --- | --- | --- | --- | --- |
determiningtopiccontinuityandreformulating
questionsintowell-definedqueriesarecrucial
| tasks. Previousapproacheshavetypicallyad- |     |     |     |     |     |     |     |     |     |     |
| ----------------------------------------- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
dressedthesetaskseitherasaclassificationtask Figure1: Anillustrativeexampleofdialogue.
inthecaseoftopiccontinuityorasatextgener-
ationtaskforquestionreformulation. However, To address such ambiguities, a number of
nopriorworkhascombinedbothtaskstoeffec- approacheshavebeenexplored,suchasfollow-up
tivelyidentifyambiguousquestionsaspartofa
|               |                              |     |     | question | identification |     | (Bertomeu |     | et al., | 2006; |
| ------------- | ---------------------------- | --- | --- | -------- | -------------- | --- | --------- | --- | ------- | ----- |
| conversation. | Inthispaper,weproposeaMulti- |     |     |          |                |     |           |     |         |       |
KirschnerandBernardi,2007,2009;Kunduetal.,
TaskLearning(MTL)approachthatusesatext
2020)andconversationalquestionrewriting(Lin
generationmodelforbothquestionrewriting
|     |     |     |     | et al., 2020; | Mele | et  | al., 2021; | Ren | et  | al., 2018; |
| --- | --- | --- | --- | ------------- | ---- | --- | ---------- | --- | --- | ---------- |
andclassification.Ourmodels,basedonBART
and T5, are trained to rewrite conversational Vakulenkoetal.,2021a,b;Voskaridesetal.,2020;
questionsandidentifyfollow-upquestionssi- Yu et al., 2020). Indeed, the follow-up question
multaneously. We evaluate our approach on identification approaches have been used in
| multiple | test sets | and demonstrate | that it out- |     |     |     |     |     |     |     |
| -------- | --------- | --------------- | ------------ | --- | --- | --- | --- | --- | --- | --- |
ConversationalQAtoenhancetheinterpretationof
performssingle-tasklearningbaselinesonthe
|     |     |     |     | theuser’sintentandcontext. |     |     |     | Themainobjective |     |     |
| --- | --- | --- | --- | -------------------------- | --- | --- | --- | ---------------- | --- | --- |
threeLIFtestsets,withstatisticallysignificant
|     |     |     |     | of these | approaches |     | is to | determine |     | whether |
| --- | --- | --- | --- | -------- | ---------- | --- | ----- | --------- | --- | ------- |
improvementsrangingfrom+3.5%to+10.5%
|                               |     |     |        | a follow-up | question |     | is linked |     | to the | previous |
| ----------------------------- | --- | --- | ------ | ----------- | -------- | --- | --------- | --- | ------ | -------- |
| intermsofF1andMicro-F1scores. |     |     | Wealso |             |          |     |           |     |        |          |
showthatourapproachoutperformssingle-task conversationhistoryornot. Ifitisdeterminedthat
questionrewritingmodelsinpassageretrieval the follow-up question is related to the previous
onalargeOR-QuACtestset. conversation,thesystemcanleveragethecontext
|     |     |     |     | provided | by the | conversation |     | to  | generate | more |
| --- | --- | --- | --- | -------- | ------ | ------------ | --- | --- | -------- | ---- |
1 Introduction
|                                           |     |     |     | precise and | relevant |     | responses. |            | In Figure | 1, a     |
| ----------------------------------------- | --- | --- | --- | ----------- | -------- | --- | ---------- | ---------- | --------- | -------- |
|                                           |     |     |     | follow-up   | question | (q  | ) is       | classified | as        | valid if |
| ConversationalQuestionAnswering(QA),which |     |     |     |             |          |     | 3          |            |           |          |
simulateshumandialoguesininformation-seeking it can be linked to the previous conversation
tasks,necessitatesresolvingambiguitiesintheuser (q ,a ,q ,a ),elseitisclassifiedasinvalid(e.g.,
|     |     |     |     | 1 1 | 2 2 |     |     |     |     |     |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
queriesbasedontheconversationhistory(Kundu q 4 ). Forexample,thethree-wayattentivepooling
|                |        |               |              | network | approach | (Kundu |     | et al., | 2020) | predicts |
| -------------- | ------ | ------------- | ------------ | ------- | -------- | ------ | --- | ------- | ----- | -------- |
| et al., 2020). | Figure | 1 exemplifies | the possible |         |          |        |     |         |       |          |
ambiguitiesthatmightarisefromatypicaldialogue thiscontinuitybyanalysingthecandidatequestion
withauser,highlightingtheimportanceofaddress- and conversation history, outperforming other
modelssuchasBiLSTM,CNN,andBERT(Devlin
| ing these ambiguities |     | based on | the conversation |     |     |     |     |     |     |     |
| --------------------- | --- | -------- | ---------------- | --- | --- | --- | --- | --- | --- | --- |
history. Forexample,inthequestionq ,“Washe et al., 2019). In this paper, we use the three-way
3
theownerofthepaper?”,the“he”and“thepaper” attentivepoolingnetworkasourstrongestbaseline.
referentsarecontext-dependent,typicallyclarified On the other hand, conversational question
bypriorquestions(q ,q )andanswers(a ,a ). rewriting approaches have been employed in
|     |     | 1 2 | 1 2 |     |     |     |     |     |     |     |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

| Conversational          |     | QA          | to enhance             |                  | the accuracy | of  |     |     |     |     |     |     |
| ----------------------- | --- | ----------- | ---------------------- | ---------------- | ------------ | --- | --- | --- | --- | --- | --- | --- |
| the retrieved           |     | information |                        | by reformulating |              | the |     |     |     |     |     |     |
| user’soriginalquestion. |     |             | Theseapproachesusually |                  |              |     |     |     |     |     |     |     |
involvemodifyingtheoriginalquestionorgener-
| ating new | queries      | that | better | represent |                | the user’s |     |     |     |     |     |     |
| --------- | ------------ | ---- | ------ | --------- | -------------- | ---------- | --- | --- | --- | --- | --- | --- |
| intent by | transforming |      | a      | concise   | conversational |            |     |     |     |     |     |     |
questionintoafully-grown,contextualisedad-hoc
q′
| query. | For example, |     | in Figure | 1,  | the question |     |     |     |     |     |     |     |
| ------ | ------------ | --- | --------- | --- | ------------ | --- | --- | --- | --- | --- | --- | --- |
3
| “Was Sheldon |     | the owner                   |     | of the Israeli |     | press?” is |     |     |     |     |     |     |
| ------------ | --- | --------------------------- | --- | -------------- | --- | ---------- | --- | --- | --- | --- | --- | --- |
| arewriteofq  |     | “Washetheownerofthepaper?”, |     |                |     |            |     |     |     |     |     |     |
3
| based on | the | conversation |     | history | (q ,a | ,q ,a ). |          |                        |     |     |     |              |
| -------- | --- | ------------ | --- | ------- | ----- | -------- | -------- | ---------------------- | --- | --- | --- | ------------ |
|          |     |              |     |         | 1     | 1 2 2    | Figure2: | ComparisonofMTLmodels: |     |     |     | (a)adiscrim- |
AT5(Raffeletal.,2020)modelcanbefine-tuned
|                  |     |             |     |     |          |     | inative+generative |     | model    | with      | separate | heads for the |
| ---------------- | --- | ----------- | --- | --- | -------- | --- | ------------------ | --- | -------- | --------- | -------- | ------------- |
| to automatically |     | reformulate |     | the | question | by  |                    |     |          |           |          |               |
|                  |     |             |     |     |          |     | classification     | and | question | rewriting | tasks,   | and (b) a     |
injecting information that exists in the context generativemodelwithacombinedtokengenerationfor
| into a        | fully | defined | query   | (Lin            | et         | al., 2020). | bothtasks.              |     |     |     |                      |     |
| ------------- | ----- | ------- | ------- | --------------- | ---------- | ----------- | ----------------------- | --- | --- | --- | -------------------- | --- |
| Previous      | work, | such    | as (Lin | et              | al., 2020; | Mele        |                         |     |     |     |                      |     |
|               |       |         |         |                 |            |             | relevancecanbeenhanced. |     |     |     | Indeed,byidentifying |     |
| et al., 2021; |       | Ren et  | al.,    | 2018; Vakulenko |            | et al.,     |                         |     |     |     |                      |     |
connectionsbetweentheuser’squestions,address-
2021a,b;Voskaridesetal.,2020;Yuetal.,2020),
ingambiguities,andleveragingtheconversation’s
| focused | on  | conversational |     | question |     | rewriting; |     |     |     |     |     |     |
| ------- | --- | -------------- | --- | -------- | --- | ---------- | --- | --- | --- | --- | --- | --- |
context,thesystemcanrefineitsunderstandingof
however,theydidnotaddressthetaskoffollow-up
|                                |                 |     |     |             |               |           | the user | intent     | and can | provide  | more       | precise and |
| ------------------------------ | --------------- | --- | --- | ----------- | ------------- | --------- | -------- | ---------- | ------- | -------- | ---------- | ----------- |
| question                       | identification. |     | In  | this paper, | to            | alleviate |          |            |         |          |            |             |
|                                |                 |     |     |             |               |           | relevant | responses. |         | Our text | generation | models      |
| ambiguitiesinconversationalQA, |                 |     |     |             | weinvestigate |           |          |            |         |          |            |             |
leveragetheMulti-TaskLearningoftheconversa-
| the combination |     | of  | both | the follow-up |     | question |                 |     |           |     |                |       |
| --------------- | --- | --- | ---- | ------------- | --- | -------- | --------------- | --- | --------- | --- | -------------- | ----- |
|                 |     |     |      |               |     |          | tional question |     | rewriting | and | classification | tasks |
identificationtaskandtheconversationalquestion
toidentifywhetheraquestionisafollow-uptothe
| rewriting | task | into | a single | framework, |     | thereby |          |          |      |              |     |             |
| --------- | ---- | ---- | -------- | ---------- | --- | ------- | -------- | -------- | ---- | ------------ | --- | ----------- |
|           |      |      |          |            |     |         | previous | question | and, | accordingly, |     | reformulate |
alsoimprovingtheeffectivenessofbothtasks.
|           |       |            |          |          |       |            | aquestionusingthedialoguecontext. |            |       |         |             | Tothebest  |
| --------- | ----- | ---------- | -------- | -------- | ----- | ---------- | --------------------------------- | ---------- | ----- | ------- | ----------- | ---------- |
| Recently, |       | Multi-Task |          | Learning | (MTL) | has        |                                   |            |       |         |             |            |
|           |       |            |          |          |       |            | of our                            | knowledge, | no    | prior   | work has    | inherently |
| emerged   | as an | effective  | approach |          | for   | simultane- |                                   |            |       |         |             |            |
|           |       |            |          |          |       |            | combined                          | both       | tasks | to more | effectively | address    |
ously learning numerous related tasks (Ide and ambiguityinconversationalquestions.
| Kawahara, | 2021; | Kongyoung |     | et  | al., 2022). | MTL |                               |     |     |     |     |             |
| --------- | ----- | --------- | --- | --- | ----------- | --- | ----------------------------- | --- | --- | --- | --- | ----------- |
|           |       |           |     |     |             |     | Ourcontributionsareasfollows: |     |     |     |     | (1)Welever- |
canbeusedtoincreaseasystem’sperformanceon
|     |     |     |     |     |     |     | age Multi-Task |     | Learning | with | a text | generation |
| --- | --- | --- | --- | --- | --- | --- | -------------- | --- | -------- | ---- | ------ | ---------- |
thetextgenerationtaskbyleveragingclassification
modeltoeffectivelyaddressthetasksoffollow-up
tasks. For example, Ide and Kawahara (2021) questionidentificationandconversationalquestion
adoptedanMTLapproachusingatextgeneration
rewriting;(2)UsingtherecentLIFdataset(Kundu
| BART | (Lewis | et al., | 2019) | model, | which | jointly |     |     |     |     |     |     |
| ---- | ------ | ------- | ----- | ------ | ----- | ------- | --- | --- | --- | --- | --- | --- |
etal.,2020),wecompareourmodelstotworecent
learns a classification task and a text generation baselines from the literature, and show that our
| task by | sharing | the | learner, | and | showed | an im- |     |     |     |     |     |     |
| ------- | ------- | --- | -------- | --- | ------ | ------ | --- | --- | --- | --- | --- | --- |
Multi-TaskLearningBARTmodelyieldsthebest
provementinanemotion-awaredialogueresponse
F1andMacro-F1performanceimprovementsover
generation model. Text generation models like thestrongestbaseline,three-wayattentivepooling,
T5 have also been effectively used for multi-task with statistically significant improvements rang-
| learning | involving | both | text | generation |     | and clas- |          |      |          |     |         |                |
| -------- | --------- | ---- | ---- | ---------- | --- | --------- | -------- | ---- | -------- | --- | ------- | -------------- |
|          |           |      |      |            |     |           | ing from | 3.5% | to 10.5% | on  | all LIF | test sets; (3) |
sificationtasks,suchaspassageranking/re-ranking
OurproposedMulti-TaskLearningT5modelsig-
and answer generation/extraction (Kongyoung nificantlyoutperformsthesingle-tasklearningof
| et al., 2022; |     | Lee et | al., 2022; | Jiang | et  | al., 2022). |     |     |     |     |     |     |
| ------------- | --- | ------ | ---------- | ----- | --- | ----------- | --- | --- | --- | --- | --- | --- |
questionrewritingmodelsforpassageretrievalon
Giventheireffectivenessonvarioustasks,weargue
theOR-QuACtestset.
thattextgenerationmodels–BARTandT5–can
betailoredforthefollow-upquestionidentification 2 MTL:Classification&Generation
andconversationalquestionrewritingtasks.
|     |     |     |     |     |     |     | We define | the | follow-up | question | identification |     |
| --- | --- | --- | --- | --- | --- | --- | --------- | --- | --------- | -------- | -------------- | --- |
Our intuition is that by combining follow-up and conversational question rewriting tasks in
questionidentificationandconversationalquestion Sections2.1&2.2. Anoverviewoftheproposed
rewriting, the system’s response accuracy and textgenerationmodelfollowsinSection2.3.

2.1 Follow-upQuestionIdentification generation. Suchtextgenerationapproachescanbe
trainedtogenerateameaningfultextualresponse
| Following |           | Kundu   | et al. (2020), | we       | consider |                       |     |                       |     |     |     |
| --------- | --------- | ------- | -------------- | -------- | -------- | --------------------- | --- | --------------------- | --- | --- | --- |
|           |           |         |                |          |          | basedonsomeinputtext. |     | Moreover,likeBERT,the |     |     |     |
| the       | following | inputs: | a list of      | previous | ques-    |                       |     |                       |     |     |     |
pre-trainedBARTandT5modelscanbefine-tuned
| tions, | a   | list of their | corresponding | ground | truth |     |     |     |     |     |     |
| ------ | --- | ------------- | ------------- | ------ | ----- | --- | --- | --- | --- | --- | --- |
toperformavarietyofdownstreamtasks.
| answer |     | (respectively | denoted | as [q 1 | ,q 2 ,...q k | ]   |     |     |     |     |     |
| ------ | --- | ------------- | ------- | ------- | ------------ | --- | --- | --- | --- | --- | --- |
and [a ,a ,...a ] where k is the number of the Inaddition,themannerinwhichatextgenera-
|     | 1   | 2 k |     |     |     |     |     |     |     |     |     |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
previousquestion-answerpairintheconversation tion model is used in classification tasks can dif-
fer,astheycanbefine-tunedasdiscriminativeor
| history), |     | and a candidate | follow-up | question | q c | .   |     |     |     |     |     |
| --------- | --- | --------------- | --------- | -------- | --- | --- | --- | --- | --- | --- | --- |
Given these inputs, the first task we address is to generative models. In a discriminative setup, the
predict whether or not the candidate follow-up modelisadaptedforbinaryclassificationbyadding
questionq isavalidfollow-upquestion. Figure1 a fully-connected layer with two output neurons
c
(correspondingtoeachclass)uponaspecial[CLS]
| exemplifies |     | the follow-up | question | identification |     |     |     |     |     |     |     |
| ----------- | --- | ------------- | -------- | -------------- | --- | --- | --- | --- | --- | --- | --- |
task, showing a history of length k = 2 with the tokeninBERT,orthelasttokeninBART.Incon-
correspondingquestionsandanswers. Inparticular, trast,agenerativesetupreframesNLPtasksastext
generationtasks-forinstance,classificationisper-
asthistaskisabinaryclassificationtask,theaim
of a follow-up question identification approach formed by examining what text is generated and
is to classify a question q as a valid follow-up thecorrespondinglikelihood.
c
| questionorasinvalid. |     |     |     |     |     | AnMTLTextGenerationApproach: |     |        |            | Toadapt |     |
| -------------------- | --- | --- | --- | --- | --- | ---------------------------- | --- | ------ | ---------- | ------- | --- |
|                      |     |     |     |     |     | an MTL approach              | to  | a text | generation | model   | for |
2.2 ConversationalQuestionRewriting
|     |     |     |     |     |     | jointly learning   | from   | both | the classification |     | and     |
| --- | --- | --- | --- | --- | --- | ------------------ | ------ | ---- | ------------------ | --- | ------- |
|     |     |     |     |     |     | question rewriting | tasks, | the  | model              | can | be used |
FollowingElgoharyetal.(2019),givenaconver-
sation history H consisting of a list of k ques- in either a discriminative+generative or in a gen-
k
tions and a list of ground truth answer pairs, i.e erative setup as shown in Figure 2. A discrimi-
H k = [⟨q,a⟩], the task is to generate a rewrite native+generativeMTLmodelmakespredictions
q′ for the next question q based on H . Be- by applying a CLS head to create a score for a
| m   |     |     | m   |     | k   |     |     |     |     |     |     |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
cause q is part of the conversation, its meaning classificationtaskandanLMheadtogeneratethe
m
frequently includes references to parts of H . A tokensforaquestionrewritingtask(IdeandKawa-
k
|       | q′  |           |                 |      |           | hara,2021)asshowninFigure2(a). |     |     |     | Incontrast,a |     |
| ----- | --- | --------- | --------------- | ---- | --------- | ------------------------------ | --- | --- | --- | ------------ | --- |
| valid | m   | should be | self-contained: | i.e. | a correct |                                |     |     |     |              |     |
answer to q′ without the history H is a correct generativeMTLmodelmakespredictionsbygen-
|     |     | m   |     | k   |     |     |     |     |     |     |     |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
answertoq withthehistoryH . Figure1exem- eratingthefirsttokenforaclassificationtaskand
|     |     | m   |     | k   |     |     |     |     |     |     |     |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
plifies the conversational question rewriting task, thefollow-uptokensforaqueryrewritingtaskas
showingahistoryoflengthk = 2withthecorre- shown in Figure 2 (b). Notably, while text gen-
spondingquestionsandanswers. Thequestionq eration models like BART can function in either
3
omitsthefirstquestion(replacingthepronoun“he” thediscriminative+generativeorgenerativeMTL
setups,theT5modelisexclusivelyapplicableasa
withSheldonandreplacing“thepage”withIsraeli
press ). Hence, to address this task, the system generativeMTLmodel(Raffeletal.,2020).
| needstoresolveanyomissionbyusinghistoryH |     |     |     |     |     | .              |      |             |     |        |       |
| ---------------------------------------- | --- | --- | --- | --- | --- | -------------- | ---- | ----------- | --- | ------ | ----- |
|                                          |     |     |     |     | k   | In particular, | when | fine-tuning |     | the T5 | model |
Next, we describe the MTL approaches to com- for a downstream task, a prefix text is required
binethefollow-upquestionidentificationwiththe
|     |     |     |     |     |     | – for example | “translate |     | English | to German:” |     |
| --- | --- | --- | --- | --- | --- | ------------- | ---------- | --- | ------- | ----------- | --- |
conversationalquestionrewriting.
|     |     |     |     |     |     | might be used       | for | a translation |           | task. | Indeed, |
| --- | --- | --- | --- | --- | --- | ------------------- | --- | ------------- | --------- | ----- | ------- |
|     |     |     |     |     |     | the text generation |     | models        | have been | shown | to      |
2.3 ModelOverview
|     |     |     |     |     |     | achieve state-of-the-art |     | performances |     | in  | classifi- |
| --- | --- | --- | --- | --- | --- | ------------------------ | --- | ------------ | --- | --- | --------- |
To tackle the tasks described in Sections 2.1 cation (Lewis et al., 2019; Raffel et al., 2020),
and 2.2, we propose classification and question as well as in document re-ranking – by ranking
rewritingmodelsthatleveragehistoricalquestions basedonthelikelihoodofgeneratingaparticular
to identify whether a candidate question q is token (Nogueira et al., 2020; dos Santos et al.,
c
a follow-up to the previous question and to 2020)(outperformingBERTmodels)andevenin
reformulatethecurrentquestionq . Ourproposed arithmetic tasks (Nogueira et al., 2021). Hence,
m
methodusesmodelsincludingBART(Lewisetal., for the MTL of both the follow-up question
2019)andT5(Raffeletal.,2020),whicharelarge identification and question rewriting tasks we
pre-trained language models designed for text choosetheMTLgenerativeversionoftheBART

andT5models. However,forcomparisonpurposes, LIF+CANARD LIF OR-QuAC
Train Dev Test-I Test-II Test-III Test
we also deploy the discriminative+generative #questions 62,839 4914 5,992 5,247 2,685 5571
#validfollow-up 22,056 1,559 1,940 1,940 1,940 -
versionsoftheBARTmodelsinourexperiments.
#invalidfollow-up 40,783 3,355 4,052 3,307 745 -
Moreprecisely,wedeploygenerativeMTLmod-
Table1: Statisticsoftheuseddatasets
els to capture the relation between the question
q /q and the contextual information in the con-
c m
versation history, including the historical ques- andtherewrittenquestion. ThelossfunctionL
gen
tion(s){q 1 ,q 2 ,...q k },andthehistoricalanswer(s) measures the discrepancy between the generated
{a 1 ,a 2 ,...a k }, as shown in Figure 2 (b). In par- tokensandtheground-truthtokens. Tosummarise,
ticular, let Gen(·) denotes a generative transfor- our MTL method involves fine-tuning the gener-
mation function by taking the input sequence as ativemodeltosimultaneouslygeneratesequence
follows: tokens for the follow-up question identification
(cid:1)
Gen(“prompt : ”q “[SEP]” H (1) andconversationalquestionrewriting.
c k
Inadditiontotheimplementationofthegener-
Gen(·) = w ,w ,...,w (2)
1 2 n
ative MTL model, we also incorporate a discrim-
where “prompt:” is a prefix text, and “[SEP]” is
inative+generative MTL model as shown in Fig-
a special token. The model is then fine-tuned to
ure2(a),anddescribedinAppendixA.1.
generate the target tokens length n as shown in
3 ExperimentalSetup
Equation (2), for the token w namely “follow”
1
or “shift”1 depending on whether the candidate
We list our research questions in Section 3.1,
question is a valid follow-up to the previous
introduce the used datasets in Section 3.2 and
question or not, while the follow-up tokens
presentourbaselinesinSection3.3
w ,...,w are the output sequence for the target
2 n
3.1 ResearchQuestions
query. Inparticular,apromptfunction,asshownin
Equation(1),isemployedtoformatandcombine Weaddresstwomainresearchquestions:
the question (q ) and the conversational history RQ1: Does the MTL approach of question
c
(q ...q ,a ...a ), creating a well-structured input rewriting and classification using text generation
1 k 1 k
sequence for Gen(·). Subsequently, Gen(·) modelsoutperformthesingle-tasklearning(STL)
generates the contextual representation h. Once of text generation models and existing baselines
the contextual representation h is obtained, it is forthefollow-upquestionidentificationtask?
used by the Gen(·) decoder. This decoder takes RQ2: Does the MTL approach of question
the previously generated tokens as input and rewriting and classification using text generation
performsattentionoverh,enablingittogenerate modelsoutperformthesingle-tasklearning(STL)
thesubsequenttoken. Specifically,whengiventhe of text generation models in the context of the
tuple ⟨q ,q ...q ,a ...a ⟩, our training objective conversational question rewriting and passage
c 1 k 1 k
aimstominimisethefollowinglossfunction: retrievaltasks?
M
(cid:88) 3.2 Datasets
L = logP(w |h,w ) (3)
gen i :i
i=0 WeexperimentusingtheLIFdataset(Learningto
where M is the number of tokens in the target IdentifyFollow-Up)(Kunduetal.,2020)andthe
sequence, which consists of the ground-truth CANARDdataset(ContextAbstraction: Necessary
follow-up question identification token w 1 fol- AdditionalRewrittenDiscourse)(Elgoharyetal.,
lowed by the tokens in the manually rewritten 2019), which are a recent adaptation of the well-
questionq′ . Inaddition,q′ referstotheithtoken known QuAC Conversational QA dataset (Choi
m mi
inq m ′ wheni ≥ 2andthetokenw 0 isthebeginning et al., 2018). For training the models to address
of the sequence token (<s>). Our goal is to train bothtasks,inthetraininganddevelopmentsets,we
the model to generate subsequent tokens using integrate LIF and CANARD by picking only the
theground-truthfollow-upquestionidentification candidatequestionsfromtheLIFdatasetthatexist
intheCANARDdataset. Toevaluatethemodels
1We choose “follow” and “shift” as target tokens be- in the follow-up question identification task, we
cause T5 tokenises sequences using the SentencePiece ap-
use the three test sets of the LIF dataset, namely
proach(KudoandRichardson,2018),whichsplitstheword
“invalid”intotwosubwords. Test-I, Test-II, and Test-III. In all three test sets,

onlygeneratetherewrittenquestionq′
| the valid | follow-up | questions | (label | = 1) | are con- |     |     |     |     |     | . Wecom- |     |
| --------- | --------- | --------- | ------ | ---- | -------- | --- | --- | --- | --- | --- | -------- | --- |
m
structedfromthe“shouldaskfollow-upquestion” parethemintermsofbothconversationalquestion
instances in the QuAC dataset. For the invalid rewritingandpassageretrievaleffectiveness.
follow-up questions (label = 0), Test-I combines Hyperparameter settings and evaluation
| the invalid | instances | from | Test-II | & Test-III. | For |          |            |     |               |     |        |        |
| ----------- | --------- | ---- | ------- | ----------- | --- | -------- | ---------- | --- | ------------- | --- | ------ | ------ |
|             |           |      |         |             |     | metrics: | We provide |     | a description |     | of the | hyper- |
Test-II,questionswithahighsimilaritytothecur- parametersettingsandtheusedevaluationmetrics
rentpassagearesampledfromotherconversations. inAppendixA.2andA.3,respectively.
Ontheotherhand,forTest-III,theinvalidfollow-
upquestionsaresampledfromthenon-follow-up 4 ExperimentalResults
| questionsofthesameconversationinQuAC. |     |     |     |     | For |     |     |     |     |     |     |     |
| ------------------------------------- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
WenowaddressRQs1&2,andconcludewitha
thequestionrewritingtask,weusethetestsetsof
qualitativeanalysis.
| the OR-QuAC     |     | dataset. | We also | aggregate | a pas- |          |                         |     |     |     |     |     |
| --------------- | --- | -------- | ------- | --------- | ------ | -------- | ----------------------- | --- | --- | --- | --- | --- |
| sage collection |     | from the | OR-QuAC | dataset   | (Qu    |          |                         |     |     |     |     |     |
|                 |     |          |         |           |        | 4.1 RQ1: | Follow-upIdentification |     |     |     |     |     |
etal.,2020),whichisanaggregationofthreeexist-
|     |     |     |     |     |     | We investigate |     | the performance |     | of  | the baselines |     |
| --- | --- | --- | --- | --- | --- | -------------- | --- | --------------- | --- | --- | ------------- | --- |
ingdatasetsconsistingofQuAC,CANARD,and
Wikipedia,toevaluatethepassageretrievalperfor- describedinSection3.3incomparisontoourpro-
posedMTLtextgenerationmodelsforfollow-up
manceoftheconversationalquestionrewritingtask.
questionidentificationonallthreetestsetsofthe
Thisallowsustoassessourmodel’sperformance
acrossboththeconversationalquestionanswering LIFdataset. Table2comparesourproposedMTL
andpassageretrievaltasks. Forfurtherinformation textgenerationmodelstothebaselinesonallthree
testsetsoftheLIFdataset.
abouttheuseddatasets,wealsoprovideasummary
|     |     |     |     |     |     | Comparison |     | of the | MTL | Models | with | the |
| --- | --- | --- | --- | --- | --- | ---------- | --- | ------ | --- | ------ | ---- | --- |
oftheirstatisticsinTable1.
BaselinesforFollow-upQuestionIdentification:
3.3 BaselinesandImplementation Fromthetable,onthreetestsetsoftheLIFdataset,
|     |     |     |     |     |     | we see that | the | generative | MTL | BART | classifier |     |
| --- | --- | --- | --- | --- | --- | ----------- | --- | ---------- | --- | ---- | ---------- | --- |
Follow-upquestionidentificationtask: Weonly modelachievesthehighestrecall,F1,andMacro-
| include | neural | models | as our baselines |     | since the |            |     |     |             |     |               |     |
| ------- | ------ | ------ | ---------------- | --- | --------- | ---------- | --- | --- | ----------- | --- | ------------- | --- |
|         |        |        |                  |     |           | F1, except | MTL | T5  | in Test-III |     | for Macro-F1. |     |
existingrule-basedandstatisticalmachinelearning Whilethebestprecisionscoresonallthreetestsets
modelshavebeenshowntobemuchlesseffective are obtained by the three-way attentive pooling,
| in the follow-up |     | question | identification |     | task in a |     |     |     |     |     |     |     |
| ---------------- | --- | -------- | -------------- | --- | --------- | --- | --- | --- | --- | --- | --- | --- |
discriminative+generativeMTLBART,andMTL
previous study (Kundu et al., 2020). Indeed, as T5, respectively. Within the table, on all three
baselines,wechoosethestrongestbaselineinthe test sets, our proposed generative MTL BART,
previousstudy(Kunduetal.,2020),BERT,aswell significantly outperforms the baseline, BERT,
asthestate-of-the-art(SOTA)three-wayattentive
|     |     |     |     |     |     | three-way | attentive | pooling, |     | STL | BART | (both |
| --- | --- | --- | --- | --- | --- | --------- | --------- | -------- | --- | --- | ---- | ----- |
poolingmodelfromthesamestudy. Forthethree- discriminative and generative), and STL T5 in
way attentive pooling model, we reproduce the termsofF1andMacroF1,exceptMTLT5inTest-
modelanditsevaluationresultsprovidedbyKundu
|     |     |     |     |     |     | III for Macro-F1. |     | These | results | suggest |     | that the |
| --- | --- | --- | --- | --- | --- | ----------------- | --- | ----- | ------- | ------- | --- | -------- |
et al. (2020). We additionally compare our MTL generative MTL BART classifier model exhibits
of the generative BART and T5 models with the strong overall performance and exceeds other
Single-TaskLearning(STL)ofT5andBART.The modelsintermsofrecall,F1score,andMacro-F1
STLmodelsareonlylearnedtopredictwhethera
|     |     |     |     |     |     | score across | most | test | sets. | This | highlights | its |
| --- | --- | --- | --- | --- | --- | ------------ | ---- | ---- | ----- | ---- | ---------- | --- |
given question is a follow-up question. We addi- abilitytoaccuratelypredicttruepositiveinstances
tionallycompareourgenerativeBARTmodelwith (valid follow-up question) while maintaining a
thediscriminative+generativeversionofBART,as
goodbalancebetweenprecisionandrecall.
describedinSection2.3.
|     |     |     |     |     |     | Comparison |     | of the | MTL | Models | with | STL: |
| --- | --- | --- | --- | --- | --- | ---------- | --- | ------ | --- | ------ | ---- | ---- |
Conversational question rewriting task: We We observe that the generative MTL BART
compare our query rewriting methods with the classifier model significantly outperforms the
followingmodels: Raw: Theuser’soriginalcurrent STL BART (both discriminative and generative)
question;Manual: Thequestionsarewrittenbyhu- modelsintermsofF1andMacro-F1onallthree
mansfromtheCANARDdataset. Wealsocompare test sets. This indicates that the MTL approach,
ourproposedmethodswiththeSingle-TaskLearn- which jointly trains the model on the follow-up
ing (STL) of BART and T5, which are learned to questionidentificationandconversationalquestion

|     |     |     |     | Test-I |     | Test-II |     |     |     | Test-III |     |     |
| --- | --- | --- | --- | ------ | --- | ------- | --- | --- | --- | -------- | --- | --- |
Models
|     |     | P   | R   | F1 Macro-F1 | P   | R   | F1 Macro-F1 |     | P   | R   | F1 Macro-F1 |     |
| --- | --- | --- | --- | ----------- | --- | --- | ----------- | --- | --- | --- | ----------- | --- |
STL BERT 70.7 79.5 74.9†‡ 80.8†‡ 85.6 79.5 82.5† 86.4† 80.2 79.5 79.9† 64.2†‡
3-wayAP 71.6 70.0 71.6†‡ 79.2†‡ 74.4 76.8 75.6†‡ 80.5†‡ 79.7 70.0 74.6†‡ 60.4†‡
BART(dis) 69.7 79.4 74.2†‡ 80.3†‡ 85.7 79.4 82.5†‡ 86.4† 78.9 79.4 79.1† 62.1†‡
BART(gen) 71.0 79.7 75.1†‡ 81.0† 87.4 79.7 83.4† 87.1† 79.1 79.7 79.4† 62.5†‡
T5 69.9 83.0 75.9† 81.4† 85.3 83.0 84.2† 87.5† 79.5 83.0 81.2† 64.0†
MTL BART(dis+gen) 71.5 84.6 77.5 82.6 86.3 84.6 85.4 88.5 80.6 84.6 82.5 66.4
BART(gen) 70.3 87.3 77.9 82.7 84.9 87.3 86.1 88.9 80.4 87.3 83.7 66.9
T5 71.3 83.5 76.9† 82.2 85.4 81.6 83.5† 87.1† 84.6 77.6 80.9† 68.9
Table2: Resultsforfollow-upquestionidentification. †denotesaperformancethatissignificantlyworsethanthe
MTLBARTmodel(McNemar’stest,p<0.05);‡denotesaperformancethatissignificantlyworsethantheMTL
T5model(McNemar’stest,p<0.05). 3-wayAPdenotestheThree-WayAttentivePooling. Thehighestvaluefor
eachmeasureishighlighted.
rewritingtasks,providesanotableadvantageover BM252 retrievalmodel. Theeffectivenessofthe
theSTLapproachfortheBARTclassifiermodel. monoT5re-rankerforthesame1000retrievedpas-
However,theMTLT5modeldoesnotoutperform sagesislistedinthesamerow. Theeffectiveness
the STL T5 model in terms of F1 and Macro-F1, ofthemanuallyrewrittenquestionscanbeseenas
butthetwomodelsarenotsignificantlydifferent. anupperboundforthequestionrewritingmethods.
ComparisonBetweenOurGenerativeMTL Comparison of the MTL Models with the
BaselinesforConversationalQuestionRewrit-
| Models: | Weobservethat |     | theMTLBARTclassi- |     |      |     |       |       |         |      |         |     |
| ------- | ------------- | --- | ----------------- | --- | ---- | --- | ----- | ----- | ------- | ---- | ------- | --- |
|         |               |     |                   |     | ing: | In  | Table | 3, we | observe | that | the MTL | T5  |
fiermodelsignificantlyoutperformstheMTLT5
model in terms of F1 on all three test sets, and modelachievesthehighestROUGE-1scorebysig-
alsosignificantlyoutperformsMTLT5onMacro- nificantlyoutperformingallSTLbaselines,demon-
stratingitssuperiorperformanceincapturingthe
| F1 score | on Test-II. | Comparing |     | the discrimina- |     |     |     |     |     |     |     |     |
| -------- | ----------- | --------- | --- | --------------- | --- | --- | --- | --- | --- | --- | --- | --- |
tive+generativeandgenerativeMTLBARTmod- recall of the rewritten questions at the unigram
els, we find that there is little difference between level (individual words). On the other hand, the
generativeMTLBARTmodelachievesthehighest
| the effectiveness | of  | the two | versions | of the MLT |     |     |     |     |     |     |     |     |
| ----------------- | --- | ------- | -------- | ---------- | --- | --- | --- | --- | --- | --- | --- | --- |
BARTmodelsonbothF1andMacro-F1scoreson BLEUscorebysignificantlyoutperformingallSTL
allthreetestsets. baselines,indicatingitseffectivenessinmeasuring
thesimilaritybetweenthegeneratedtextsandthe
Therefore,inresponsetoRQ1,wefindthatour
referencetexts(themanuallyrewrittenquestions).
MTLtextgenerationmodel,BART,jointlylearned
Moreover,wecanobservethatthegenerativeMTL
throughboththefollow-upquestionidentification
BARTmodeloutperformstheSTLBARTmodelin
andconversationalquestionrewritingtaskshasthe
|     |     |     |     |     | termsofboththeROUGEandBLEUscores. |     |     |     |     |     |     | This |
| --- | --- | --- | --- | --- | --------------------------------- | --- | --- | --- | --- | --- | --- | ---- |
bestoveralleffectiveness,yieldingstatisticallysig-
|     |     |     |     |     | indicates |     | that | the generative |     | MTL | BART | model |
| --- | --- | --- | --- | --- | --------- | --- | ---- | -------------- | --- | --- | ---- | ----- |
nificantimprovementsintermsofF1andMacro-F1
achievesabetterperformanceintheconversational
overthebaselines,oneachofthethreetestsetsof
questionrewritingtaskcomparedtotheSTLBART
theLIFdataset.
model. ComparingtheMTLT5modeltotheSTL
|          |                   |     |     |     | T5  | model, | the | MTL T5 | model | achieves | a   | higher |
| -------- | ----------------- | --- | --- | --- | --- | ------ | --- | ------ | ----- | -------- | --- | ------ |
| 4.2 RQ2: | QuestionRewriting |     |     |     |     |        |     |        |       |          |     |        |
ROUGE-1score,indicatingabetterperformance
|     |     |     |     |     | in  | conversational |     | question |     | rewriting. | However, |     |
| --- | --- | --- | --- | --- | --- | -------------- | --- | -------- | --- | ---------- | -------- | --- |
Next,weexaminetheeffectivenessoftheconver-
bothmodelshavethesameBLEUscore.
| sational question | rewriting |     | models | including our |     |            |     |        |     |        |      |       |
| ----------------- | --------- | --- | ------ | ------------- | --- | ---------- | --- | ------ | --- | ------ | ---- | ----- |
|                   |           |     |        |               |     | Comparison |     | of the | MTL | Models | with | Base- |
proposedMTLtextgenerationmodels,andthose
|           |             |      |       |             | linesforPassageRetrieval: |     |     |     |     | FromTable3,weob- |     |     |
| --------- | ----------- | ---- | ----- | ----------- | ------------------------- | --- | --- | --- | --- | ---------------- | --- | --- |
| listed in | Section 3.3 | (STL | BART, | STL T5, and |                           |     |     |     |     |                  |     |     |
servethatourMTLT5generativemodelachieves
discriminative+generativeMTLBART)onthetest
|                         |                |     |                   |               | the                     | highest       | MAP, | MRR,    | and                | Recall@1000, |       | and   |
| ----------------------- | -------------- | --- | ----------------- | ------------- | ----------------------- | ------------- | ---- | ------- | ------------------ | ------------ | ----- | ----- |
| setoftheOR-QuACdataset. |                |     | Table3presentsthe |               |                         |               |      |         |                    |              |       |       |
|                         |                |     |                   |               | does                    | significantly |      | improve |                    | over the     | MTL   | BART  |
| effectiveness           | of various     |     | question          | reformulation |                         |               |      |         |                    |              |       |       |
|                         |                |     |                   |               | model                   | and           | all  | the STL | models             | in both      | first | stage |
| models for              | conversational |     | question          | rewriting,    |                         |               |      |         |                    |              |       |       |
|                         |                |     |                   |               | retrievalandre-ranking. |               |      |         | ComparingtheMTLand |              |       |       |
evaluatedbasedontheROUGE-1recallandBLEU
scores. Furthermore,themodels’effectivenessfor
2WealsoconductedexperimentswiththeDPHretrieval
passageretrievalisevaluatedwhenappliedwiththe
model,whichyieldedsimilartrends.

|     |        |     | QuestionRewriting |      |     | FirstStage(BM25) |        |      |     | Re-ranker(monoT5) |     |      |
| --- | ------ | --- | ----------------- | ---- | --- | ---------------- | ------ | ---- | --- | ----------------- | --- | ---- |
|     | Models |     | ROUGE-1           | BLEU | MAP | MRR              | R@1000 | NDCG |     | MAP               | MRR | NDCG |
Raw 62.82†‡ 36.01†‡ 0.0410†‡ 0.0424†‡ 0.2335†‡ 0.0733†‡ 0.0786†‡ 0.0809†‡ 0.1059†‡
STL BART 72.91†‡ 48.15† 0.1517†‡ 0.1617†‡ 0.5576†‡ 0.2257†‡ 0.2438†‡ 0.2580†‡ 0.3046†‡
T5 73.22‡ 45.86† 0.1720‡ 0.1843‡ 0.6055‡ 0.2524‡ 0.2783‡ 0.2957‡ 0.3430‡
MTL BART(dis+gen) 73.12‡ 48.00† 0.1571‡ 0.1685‡ 0.5790‡ 0.2348‡ 0.2562‡ 0.2708‡ 0.3189‡
BART(gen) 73.56‡ 48.79 0.1646‡ 0.1760‡ 0.6006‡ 0.2440‡ 0.2661‡ 0.2823‡ 0.3309‡
45.86†
|     |     | T5  | 74.12 |     | 0.2008 | 0.2150 | 0.6373 | 0.2829 | 0.3106 | 0.3302 |     | 0.3764 |
| --- | --- | --- | ----- | --- | ------ | ------ | ------ | ------ | ------ | ------ | --- | ------ |
Manual 100.00 100.00 0.2486 0.2682 0.8012 0.3540 0.3811 0.4066 3295.0
Table3: ComparisonbetweentheMTLmodelsandthequeryrewritingbaselines. †denotesaperformancethatis
significantlyworsethantheMTLBARTmodel(pairedt-test,p<0.05);‡denotesaperformancethatissignificantly
worsethantheMTLT5model(pairedt-test,p<0.05).
| STL                     | models, | we observe | that                  | both       | the MTL T5 | 4.3     | Analysis |            |     |               |     |          |
| ----------------------- | ------- | ---------- | --------------------- | ---------- | ---------- | ------- | -------- | ---------- | --- | ------------- | --- | -------- |
| and                     | BART    | models     | significantly         | outperform | their      |         |          |            |     |               |     |          |
|                         |         |            |                       |            |            | In this | section, | we conduct |     | a qualitative |     | analysis |
| correspondingSTLmodels. |         |            | Contrastingtheperfor- |            |            |         |          |            |     |               |     |          |
tobolstersupportforourfindingsconcerningthe
mancesofthediscriminative+generativewiththose
performanceofourMTLT5modelincomparison
ofthegenerativeMTLBARTmodels,wefindthat
totheSTLT5model,asdiscussedinSection4.2.
thereislittledifferencebetweentheeffectiveness
Thepurposeofthisqualitativeanalysisistofurther
ofthetwoversionsoftheMLTBARTmodel.
validateourresultsandtoshedadditionallightson
| Comparison |     | of  | our Proposed | MTL | Models |     |     |     |     |     |     |     |
| ---------- | --- | --- | ------------ | --- | ------ | --- | --- | --- | --- | --- | --- | --- |
theadvantagesoftheMTLapproachinthefollow-
| withtheBaselinesforbothtasks: |     |     |     |     | OurMTLT5 |     |     |     |     |     |     |     |
| ----------------------------- | --- | --- | --- | --- | -------- | --- | --- | --- | --- | --- | --- | --- |
upquestionidentificationandconversationalques-
modeldemonstratesitseffectivenessinbothtasks. tion rewriting tasks. First, we present an exam-
| It not | only | captures | the recall | of  | the rewritten |     |     |     |     |     |     |     |
| ------ | ---- | -------- | ---------- | --- | ------------- | --- | --- | --- | --- | --- | --- | --- |
pleofdialoguethatexemplifiesthedistinctadvan-
| questions |     | at the unigram | level | but also | enhances |     |     |     |     |     |     |     |
| --------- | --- | -------------- | ----- | -------- | -------- | --- | --- | --- | --- | --- | --- | --- |
tagesderivedfromtheuseoftheMTLapproachin
passageranking, resultinginourMTLT5model ourmodel,specificallyinconversationalquestion
outperformingboththeMTLBARTmodelandall rewriting. Next,weproceedtocomparethediffer-
oftheSTLmodels,yieldingstatisticallysignificant
encesinNDCGscoresbetweenourproposedMTL
improvements on both tasks. To illustrate these modelandtheSTLmodelforpassageretrieval.
findings,weprovideafurtherqualitativeanalysis
|     |     |     |     |     |     | Conversational |     |     | Question | Rewriting: |     | To il- |
| --- | --- | --- | --- | --- | --- | -------------- | --- | --- | -------- | ---------- | --- | ------ |
inSection4.3.
|     |     |     |     |     |     | lustrate | the | advantages | of  | the MTL | approach | in  |
| --- | --- | --- | --- | --- | --- | -------- | --- | ---------- | --- | ------- | -------- | --- |
In answer to RQ2, we conclude that applying the follow-up question identification and conver-
theMulti-TaskLearningofquestionrewritingand sational question rewriting tasks, we provide an
classificationtotheT5modelimprovesthepassage exampledialoguecarefullyselectedbasedonthe
retrievalperformance,yieldingstatisticallysignif- highestROUGE-1scoreachievedbyourMTLT5
icant improvements over the MTL BART model model. Thisexampledialogue,showninFigure3,
andalltheSTLmodels. clearly showcases the benefits of employing the
MTLstrategy.
Thisexampleconsistsofaconversationhistory
withtwoturns(Q1,A1,Q2,A2),thecurrentques-
|     |     |     |     |     |     | tion | (Q3), | the manually | rewritten |     | question | (Q’3), |
| --- | --- | --- | --- | --- | --- | ---- | ----- | ------------ | --------- | --- | -------- | ------ |
therewrittenquestionofourMTLT5model,and
|     |     |     |     |     |     | therewrittenquestionoftheSTLT5model. |     |                    |     |           |     | The      |
| --- | --- | --- | --- | --- | --- | ------------------------------------ | --- | ------------------ | --- | --------- | --- | -------- |
|     |     |     |     |     |     | MTL                                  | T5  | model successfully |     | predicted |     | the word |
“shift”indicatinganinvalidfollow-upquestion,as
Q3deviatesfromthepreviousconversation’stopic
ofalbumperformanceandinsteadinquiresabout
|     |     |     |     |     |     | subsequentevents. |     | TheMTLT5modelexhibitsa |     |     |     |     |
| --- | --- | --- | --- | --- | --- | ----------------- | --- | ---------------------- | --- | --- | --- | --- |
superiorperformanceinpredictinginvalidfollow-
upquestions,demonstratedbythemodelachieving
| Figure3: |     | Comparisonofquestionrewritingmodels. |     |     |     |     |     |     |     |     |     |     |
| -------- | --- | ------------------------------------ | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
thebestMacro-F1scoreontheTest-IIILIFdataset
|     |     |     |     |     |     | (as | described | in Section |     | 4.1). Notably, |     | this test |
| --- | --- | --- | --- | --- | --- | --- | --------- | ---------- | --- | -------------- | --- | --------- |

|     |     |     | clear that | the MTL T5 | model successfully | identi- |
| --- | --- | --- | ---------- | ---------- | ------------------ | ------- |
fiesacandidatequestionasavalidfollow-uptothe
previousquestion,therebydemonstratingitscapa-
bilitytopotentiallyaidinthecorrectresolutionof
|     |     |     | theomittedentity(Odissi). |     | Ontheotherhand,in |     |
| --- | --- | --- | ------------------------- | --- | ----------------- | --- |
Figure4(b),thecandidatequestion“wheredidhe
|     |     |     | go to school”                           | would not | have logically | followed |
| --- | --- | --- | --------------------------------------- | --------- | -------------- | -------- |
|     |     |     | thepreviousquestion“didhehavesiblings”. |           |                | How-     |
ever,theMTLT5modelpredictedthiscandidate
questionasavalidfollow-upquestion;hencethis
couldleadthemodeltoincorrectlyresolvetheen-
|     |     |     | tity(RoyAcuff).   | Asaresult,wecanobservethat |                    |       |
| --- | --- | --- | ----------------- | -------------------------- | ------------------ | ----- |
|     |     |     | the effectiveness | of the                     | follow-up question | iden- |
|     |     |     | tification        | task does influence        | the conversational |       |
questionrewritingtaskperformance.
|     |     |     | 5 RelatedWork |     |     |     |
| --- | --- | --- | ------------- | --- | --- | --- |
WediscussrelatedworkinConversationalQA.
| Figure 4: Examples | of dialogue | differences | in terms |     |     |     |
| ------------------ | ----------- | ----------- | -------- | --- | --- | --- |
ofNDCGforqueriesintheOR-QuACqueryset. (a) Conversational QA: Conversational QA, which
|     |     |     | involves | the correct interpretation | of  | questions |
| --- | --- | --- | -------- | -------------------------- | --- | --------- |
ahigherNDCGforMTLT5wrtSTLT5(b)ahigher
NDCGforSTLT5wrtMTLT5. within an ongoing dialogue, has been addressed
|     |     |     | by several  | datasets like | QuAC (Choi         | et al., |
| --- | --- | --- | ----------- | ------------- | ------------------ | ------- |
|     |     |     | 2018), CoQA | (Reddy        | et al., 2019), and | TREC    |
setcomprisessampledinvalidfollow-upquestions CAsT(Daltonetal.,2019,2020,2021;Owoicho
fromthesameconversation,makingthisachieve- etal.,2022). Acommonstrategyisconcatenating
| mentparticularlynoteworthy. |     | Thispredictionhelps |     |     |     |     |
| --------------------------- | --- | ------------------- | --- | --- | --- | --- |
previousquestionswiththecurrentoneforpassage
themodeltodifferentiateandchoosetheaccurate retrieval,yetthismaybesuboptimalformethods
entity “Disco Volante” instead of the misleading likeBM25,whichfavourconcisequeries. Several
prediction“CheesySynthsynergics”madebythe
studies(Aliannejadietal.,2020;Meleetal.,2020;
STL T5 model. This demonstrates the ability of Ríssola et al., 2019; Sekulic´ et al., 2020) have
theMTLT5modeltobetterleverageandinterpret offered alternatives to improve retrieval perfor-
the context of the conversation, leading to more mance. Meleetal.(2020)proposeddetectingtopic
accuratepredictionsandanimprovedperformance.
shiftsthroughheuristicsanddependencyparsing,
Passage Retrieval: We also compare the dif- while Aliannejadi et al. (2020) and Ríssola et al.
ferences in terms of NDCG scores when using (2019)utilisedBERTmodelstopredicthistorical
a BM25 ranking model with our proposed MTL questions enhancing the current one’s retrieval.
|                     |          |         | Sekulic´ | et al. (2020) furthered | this by | predicting |
| ------------------- | -------- | ------- | -------- | ----------------------- | ------- | ---------- |
| model in comparison | to using | it with | the STL  |                         |         |            |
modelinpassageretrieval(MTLT5vs.STLT5). related past questions and reformulating the
Figure4showstwoexamplesofdialoguesselected currentoneusingALBERT.Incontrast,ourwork
focusesonusingfollow-upquestionidentification
usingthedifferenceinNDCGscoresbetweenMTL
T5andSTLT5ontheOR-QuACqueryset. Over- toimproveconversationalquestionrewriting.
all,MTLT5outperformsSTLT5for781questions, Follow-upQuestionIdentification: Thistaskhas
whiletheoppositewastruefor497questions. Fol- seen diverse methods, ranging from rule-based
lowingMacdonaldetal.(2021),weonlyconsider solutions (Bertomeu et al., 2006; Kirschner and
differenceslargerthan0.15absoluteNGCGwhen Bernardi, 2007) to statistical machine learning
inspectingtheeffectoftheMTLapproach. Hence, models like Logistic Regression (Kirschner and
thisanalysisdemonstratesthatourproposedMTL Bernardi, 2009). Kundu et al. (2020) proposed a
T5modelexhibitsasuperiorperformanceoverthe standoutthree-wayattentivepoolingnetwork,iden-
STLT5modelinpassageretrieval. Tofurtherillus- tifyingfollow-upquestionsrelatedtotheconversa-
tratethispoint,wecloselyexaminethepredictions tionhistoryandtheassociatedanswerpassage,out-
madebytheMTLT5modelinFigure4(a). Itis performingrule-basedmethods,logisticregression

models,andneuralnetwork-basedmodelssuchas dialogue generation with conversational concept
BiLSTM, CNN, and BERT (Devlin et al., 2019). flows, using a conversation-aware knowledge
In our study, we utilise both the three-way atten- graph and a novel relation-aware graph encoder.
tivepoolingnetworkandBERTasbaselines,given In contrast to these studies, our work focuses on
theirproveneffectiveness. addressing the ambiguity of the conversational
|                |     |          |     |            |     |           | question | by  | reformulating |     | the | user’s | original |
| -------------- | --- | -------- | --- | ---------- | --- | --------- | -------- | --- | ------------- | --- | --- | ------ | -------- |
| Conversational |     | Question |     | Rewriting: |     | This task |          |     |               |     |     |        |          |
questionandclassifyingwhethertheconversation
| involves | transforming |     | conversational |     |     | queries |     |     |     |     |     |     |     |
| -------- | ------------ | --- | -------------- | --- | --- | ------- | --- | --- | --- | --- | --- | --- | --- |
into context-independent queries suitable for is still focused on the same topic to enhance the
accuracyoftheinformationretrievalsystem.
| information | retrieval  |     | (IR)  | systems | (Mele        | et al., |     |     |     |     |     |     |     |
| ----------- | ---------- | --- | ----- | ------- | ------------ | ------- | --- | --- | --- | --- | --- | --- | --- |
| 2021).      | Approaches |     | range | from    | sequence-to- |         |     |     |     |     |     |     |     |
6 Conclusions
| sequence       | models      |         | like LSTM           |     | and GRU | (Ren     |             |     |          |     |                |     |     |
| -------------- | ----------- | ------- | ------------------- | --- | ------- | -------- | ----------- | --- | -------- | --- | -------------- | --- | --- |
| et al., 2018), |             | to rule | and self-supervised |     |         | learning |             |     |          |     |                |     |     |
|                |             |         |                     |     |         |          | We proposed |     | a method | for | Conversational |     | QA, |
| methods        | fine-tuning |         | GPT-2               | (Yu | et al., | 2020),   |             |     |          |     |                |     |     |
whichlearnstopredictthefollow-upquestionand
| and Transformer++              |          |     | trained | on      | the CANARD     |          |                 |                    |        |           |          |       |            |
| ------------------------------ | -------- | --- | ------- | ------- | -------------- | -------- | --------------- | ------------------ | ------ | --------- | -------- | ----- | ---------- |
|                                |          |     |         |         |                |          | rewrites        | the conversational |        |           | question |       | simultane- |
| dataset(Vakulenkoetal.,2021a). |          |     |         |         | Vakulenkoetal. |          |                 |                    |        |           |          |       |            |
|                                |          |     |         |         |                |          | ously.          | Our proposed       |        | MTL       | method   | makes | use of     |
| (2021b)                        | compared |     | various | methods | on             | the CAsT |                 |                    |        |           |          |       |            |
|                                |          |     |         |         |                |          | text generation |                    | models | including |          | BART  | and T5     |
2019and2020datasets,emphasisingtheeffective-
|     |     |     |     |     |     |     | by generating |     | the first | token | for | a classification |     |
| --- | --- | --- | --- | --- | --- | --- | ------------- | --- | --------- | ----- | --- | ---------------- | --- |
nessofTransformer++. Recently,Linetal.(2020) taskandthefollow-uptokensforaconversational
presentedaT5modelforconversationalquestion
|            |                                   |     |     |     |     |     | questionrewritingtask. |     |       | Forthefollow-upquestion |     |     |         |
| ---------- | --------------------------------- | --- | --- | --- | --- | --- | ---------------------- | --- | ----- | ----------------------- | --- | --- | ------- |
| rewriting. | T5outperformedneuralnetwork-based |     |     |     |     |     |                        |     |       |                         |     |     |         |
|            |                                   |     |     |     |     |     | identification         |     | task, | our experiments         |     | on  | the LIF |
modelssuchasLSTM,GPT-2,BERT,andUniLM
|                                 |     |     |     |     |     |        | dataset | showed  | that | our            | proposed | MTL      | BART    |
| ------------------------------- | --- | --- | --- | --- | --- | ------ | ------- | ------- | ---- | -------------- | -------- | -------- | ------- |
| ontheCANARDandCAsT2019datasets. |     |     |     |     |     | Inthis |         |         |      |                |          |          |         |
|                                 |     |     |     |     |     |        | model   | has the | best | effectiveness, |          | yielding | statis- |
paper,weproposeaT5modelforconversational
ticallysignificantimprovementsoverthebaselines.
questionrewritingduetoitsoveralleffectiveness.
Forthequestionrewritingtask,ourproposedMTL
MTL in Conversational QA: MTL has been T5modelperformedbestbothintermsoffirststage
appliedinConversationalQA,primarilyfocussing retrievalandre-ranking. Furthermore,weshowed
on answer span prediction and auxiliary tasks that the BART-based model can be employed
(Kongyoungetal.,2020;Quetal.,2019;Xuetal.,
|     |     |     |     |     |     |     | for the | follow-up | question |     | identification |     | and the |
| --- | --- | --- | --- | --- | --- | --- | ------- | --------- | -------- | --- | -------------- | --- | ------- |
2019). Somestudieshavecombinedclassification conversationalquestionrewritingtasksinbothdis-
and text generation tasks to improve passage criminative+generativeandgenerativeMTLsetups.
rankingandanswergeneration(IdeandKawahara,
2021; Kongyoung et al., 2022; Lee et al., 2022; LimitationsandFutureWork
| Jiang et | al., 2022), |     | often leveraging |     | models | such |       |          |     |              |     |     |           |
| -------- | ----------- | --- | ---------------- | --- | ------ | ---- | ----- | -------- | --- | ------------ | --- | --- | --------- |
|          |             |     |                  |     |        |      | While | our work | has | demonstrated |     |     | promising |
as T5 (Raffel et al., 2020). Similarly, Jiang et al. results in leveraging multi-task learning for con-
(2021)combinedtheclassificationofrelationtypes
versationalquestionrewriting,severallimitations
| and the        | generation |                               | of sentences |     | to express | these |                     |     |     |                         |     |     |     |
| -------------- | ---------- | ----------------------------- | ------------ | --- | ---------- | ----- | ------------------- | --- | --- | ----------------------- | --- | --- | --- |
|                |            |                               |              |     |            |       | mustbeacknowledged. |     |     | Firstly,ourmodeldoesnot |     |     |     |
| relationtypes. |            | Moreover,Wangetal.(2020)aimed |              |     |            |       |                     |     |     |                         |     |     |     |
currentlyincorporateuserinteractionorfeedback.
| to improve       | the | response | selection    |            | in multi-party |          |             |                                    |         |             |            |                |         |
| ---------------- | --- | -------- | ------------ | ---------- | -------------- | -------- | ----------- | ---------------------------------- | ------- | ----------- | ---------- | -------------- | ------- |
|                  |     |          |              |            |                |          | This means  | it                                 | may not | always      | accurately |                | capture |
| conversations    |     | using    | an auxiliary |            | task,          | namely a |             |                                    |         |             |            |                |         |
|                  |     |          |              |            |                |          | user intent | or                                 | adjust  | to evolving |            | conversational |         |
| topic prediction |     | task,    | which        | classifies |                | whether  |             |                                    |         |             |            |                |         |
|                  |     |          |              |            |                |          | dynamics.   | Inaddition,withoutuserfeedback,the |         |             |            |                |         |
a follow-up question is relevant to the user. Our modellacksamechanismforcontinuouslearning
| work also | embraces |     | the | MTL | paradigm, | but |                 |     |      |            |     |               |     |
| --------- | -------- | --- | --- | --- | --------- | --- | --------------- | --- | ---- | ---------- | --- | ------------- | --- |
|           |          |     |     |     |           |     | and improvement |     | from | real-world |     | applications. |     |
unlikepriorstudiesprioritisinganswergeneration,
Finally,themodeldoesnotcurrentlyaskclarifying
responseselection,andpassageranking,wefocus
questions(Owoichoetal.,2022;Aliannejadietal.,
| on improving |     | retrieval | effectiveness |     | by  | rewriting |            |       |      |           |     |          |      |
| ------------ | --- | --------- | ------------- | --- | --- | --------- | ---------- | ----- | ---- | --------- | --- | -------- | ---- |
|              |     |           |               |     |     |           | 2021) when | faced | with | ambiguous |     | queries. | This |
theuser’squestionusingaclassificationtask.
couldlimititseffectivenessincertaincomplexor
Other Approaches Addressing Ambiguity in unclear conversational scenarios. In future work,
Conversational Questions: Shao et al. (2022) weplantoaddresstheselimitationsbyintegrating
addressed the ambiguity of the conversational userinteractionandfeedback,andbydeveloping
questionbyaskingclarifyingquestionstotheuser. a mechanism for the model to ask clarifying
Similarly, Li et al. (2023) explored enhancing questionswhennecessary.

References
|          |              |     |         |              |     |       | Manuel Kirschner                      | and | Raffaella | Bernardi. |     | 2007. An |
| -------- | ------------ | --- | ------- | ------------ | --- | ----- | ------------------------------------- | --- | --------- | --------- | --- | -------- |
|          |              |     |         |              |     |       | empiricalviewonIQAfollow-upquestions. |     |           |           |     | InProc.  |
| Mohammad | Aliannejadi, |     | Manajit | Chakraborty, |     | Este- |                                       |     |           |           |     |          |
SIGdial,pages43–46.
| banAndrésRíssola,andFabioCrestani.2020. |     |     |     |     |     | Har- |     |     |     |     |     |     |
| --------------------------------------- | --- | --- | --- | --- | --- | ---- | --- | --- | --- | --- | --- | --- |
nessingevolutionofmulti-turnconversationsforef- Manuel Kirschner and Raffaella Bernardi. 2009. Ex-
| fectiveanswerretrieval. |     |     | InProcCHIR,pages33–42. |     |     |     |     |     |     |     |     |     |
| ----------------------- | --- | --- | ---------------------- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
ploringtopiccontinuationfollow-upquestionsusing
|          |              |         |             |           |           |       | machinelearning. |     | InProc.NAACL,pages13–18. |     |     |     |
| -------- | ------------ | ------- | ----------- | --------- | --------- | ----- | ---------------- | --- | ------------------------ | --- | --- | --- |
| Mohammad | Aliannejadi, |         | Julia       | Kiseleva, | Aleksandr |       |                  |     |                          |     |     |     |
| Chuklin, | Jeff         | Dalton, | and Mikhail |           | Burtsev.  | 2021. |                  |     |                          |     |     |     |
SarawootKongyoung,CraigMacdonald,andIadhOu-
Buildingandevaluatingopen-domaindialoguecor-
|                 |            |     |            |     |       |        | nis. 2020.                                   | Multi-task | learning | using | dynamic | task |
| --------------- | ---------- | --- | ---------- | --- | ----- | ------ | -------------------------------------------- | ---------- | -------- | ----- | ------- | ---- |
| pora with       | clarifying |     | questions. | In  | Proc. | EMNLP, |                                              |            |          |       |         |      |
|                 |            |     |            |     |       |        | weightingforconversationalquestionanswering. |            |          |       |         | In   |
| pages4473–4484. |            |     |            |     |       |        | Proc.SCAI,pages17–26.                        |            |          |       |         |      |
NúriaBertomeu,HansUszkoreit,AnetteFrank,Hans-
SarawootKongyoung,CraigMacdonald,andIadhOu-
| UlrichKrieger,andBrigitteJörg.2006. |                                     |              |           |     | Contextual  |     |                          |                                      |     |                    |     |           |
| ----------------------------------- | ----------------------------------- | ------------ | --------- | --- | ----------- | --- | ------------------------ | ------------------------------------ | --- | ------------------ | --- | --------- |
|                                     |                                     |              |           |     |             |     | nis.2022.                | monoQA:Multi-tasklearningofreranking |     |                    |     |           |
| phenomena                           |                                     | and thematic | relations |     | in database | qa  |                          |                                      |     |                    |     |           |
|                                     |                                     |              |           |     |             |     | and answer               | extraction                           | for | open-retrieval     |     | conversa- |
| dialogues:                          | resultsfromawizard-of-ozexperiment. |              |           |     |             |     |                          |                                      |     |                    |     |           |
|                                     |                                     |              |           |     |             |     | tionalquestionanswering. |                                      |     | InProc.EMNLP,pages |     |           |
InProc.HLT-NAACL,pages1–8.
7207–7218.
EunsolChoi,HeHe,MohitIyyer,MarkYatskar,Wen-
tauYih, YejinChoi, PercyLiang, andLukeZettle- TakuKudoandJohnRichardson.2018. SentencePiece:
moyer.2018. QuAC:Questionansweringincontext. A simple and language independent subword tok-
|     |     |     |     |     |     |     | enizeranddetokenizerforneuraltextprocessing. |     |     |     |     | In  |
| --- | --- | --- | --- | --- | --- | --- | -------------------------------------------- | --- | --- | --- | --- | --- |
InProc.EMNLP.,page2174–2184.
Proc.EMNLP,pages66–71.
JeffreyDalton,ChenyanXiong,andJamieCallan.2019.
|      |      |       |                    |     |            |     | Souvik Kundu, | Qian | Lin, | and Hwee | Tou | Ng. 2020. |
| ---- | ---- | ----- | ------------------ | --- | ---------- | --- | ------------- | ---- | ---- | -------- | --- | --------- |
| TREC | CAsT | 2019: | The conversational |     | assistance |     |               |      |      |          |     |           |
trackoverview. InProc.TREC. Learningtoidentifyfollow-upquestionsinconver-
|                                                 |       |     |                |            |     |       | sational | question | answering. | In  | Proc. ACL, | pages |
| ----------------------------------------------- | ----- | --- | -------------- | ---------- | --- | ----- | -------- | -------- | ---------- | --- | ---------- | ----- |
| JeffreyDalton,ChenyanXiong,andJamieCallan.2020. |       |     |                |            |     |       | 959–968. |          |            |     |            |       |
| CAsT                                            | 2020: | The | conversational | assistance |     | track |          |          |            |     |            |       |
overview. InProc.TREC. HaejunLee,AkhilKedia,JongwonLee,AshwinParan-
|     |     |     |     |     |     |     | jape, Christopher |     | Manning, | and | Kyoung-Gu | Woo. |
| --- | --- | --- | --- | --- | --- | --- | ----------------- | --- | -------- | --- | --------- | ---- |
JeffreyDalton,ChenyanXiong,andJamieCallan.2021.
|           |              |     |                |            |     |       | 2022. You          | only need | one                     | model | for open-domain |     |
| --------- | ------------ | --- | -------------- | ---------- | --- | ----- | ------------------ | --------- | ----------------------- | ----- | --------------- | --- |
| CAsT      | 2021:        | The | conversational | assistance |     | track |                    |           |                         |       |                 |     |
|           |              |     |                |            |     |       | questionanswering. |           | InProc.EMNLP,pages3047– |       |                 |     |
| overview. | InProc.TREC. |     |                |            |     |       |                    |           |                         |       |                 |     |
3060.
| Jacob Devlin, |     | Ming-Wei | Chang, | Kenton | Lee, | and |             |        |      |       |        |        |
| ------------- | --- | -------- | ------ | ------ | ---- | --- | ----------- | ------ | ---- | ----- | ------ | ------ |
|               |     |          |        |        |      |     | Mike Lewis, | Yinhan | Liu, | Naman | Goyal, | Marjan |
Kristina Toutanova. 2019. BERT: Pre-training of Ghazvininejad,AbdelrahmanMohamed,OmerLevy,
deepbidirectionaltransformersforlanguageunder- Veselin Stoyanov, and Luke Zettlemoyer. 2019.
| standing. | InProc.NAACL,pages4171–4186. |     |     |     |     |     |     |     |     |     |     |     |
| --------- | ---------------------------- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
BART:Denoisingsequence-to-sequencepre-training
fornaturallanguagegeneration,translation,andcom-
CicerodosSantos,XiaofeiMa,RameshNallapati,Zhi-
|                              |         |     |             |     |             |        | prehension. | InProc.ACL,pages7871–7880. |     |     |     |     |
| ---------------------------- | ------- | --- | ----------- | --- | ----------- | ------ | ----------- | -------------------------- | --- | --- | --- | --- |
| hengHuang,andBingXiang.2020. |         |     |             |     | Beyond[CLS] |        |             |                            |     |     |     |     |
| through                      | ranking | by  | generation. | In  | Proc.       | EMNLP, |             |                            |     |     |     |     |
SihengLi,WangjieJiang,PengdaSi,ChengYang,Qiu
pages1722–1727.
Yao,JinchaoZhang,JieZhou,andYujiuYang.2023.
Ahmed Elgohary, Denis Peskov, and Jordan Boyd- Enhancingdialoguegenerationwithconversational
Graber. 2019. Can you unpack that? learning to conceptflows. InProc.EACL,pages1514–1525.
| rewritequestions-in-context. |     |     |     | InProc.EMNLP,pages |     |     |     |     |     |     |     |     |
| ---------------------------- | --- | --- | --- | ------------------ | --- | --- | --- | --- | --- | --- | --- | --- |
Sheng-ChiehLin,Jheng-HongYang,RodrigoNogueira,
5918–5924.
|         |         |         |           |     |       |        | Ming-Feng | Tsai,          | Chuan-Ju | Wang, | and Jimmy     | Lin. |
| ------- | ------- | ------- | --------- | --- | ----- | ------ | --------- | -------------- | -------- | ----- | ------------- | ---- |
|         |         |         |           |     |       |        | 2020.     | Conversational | question |       | reformulation | via  |
| Tatsuya | Ide and | Daisuke | Kawahara. |     | 2021. | Multi- |           |                |          |       |               |      |
task learning of generation and classification for sequence-to-sequence architectures and pretrained
emotion-aware dialogue response generation. In languagemodels. arXivpreprintarXiv:2004.01909.
Proc.NAACL,pages119–125.
|     |     |     |     |     |     |     | CraigMacdonaldandNicolaTonellotto.2020. |     |     |     |     | Declar- |
| --- | --- | --- | --- | --- | --- | --- | --------------------------------------- | --- | --- | --- | --- | ------- |
FengJiang,YaxinFan,XiaominChu,PeifengLi,and ativeexperimentationininformationretrievalusing
QiaomingZhu.2021. Notjustclassification: Recog- pyterrier. InProc.ICTIR,page161–168.
nizingimplicitdiscourserelationonjointmodeling
of classification and generation. In Proc. EMNLP, Craig Macdonald, Nicola Tonellotto, and Iadh Ounis.
pages2418–2431. 2021. On single and multiple representations in
|     |     |     |     |     |     |     | densepassageretrieval. |     | InProc.IIR. |     |     |     |
| --- | --- | --- | --- | --- | --- | --- | ---------------------- | --- | ----------- | --- | --- | --- |
ZhengbaoJiang,LuyuGao,ZhiruoWang,JunAraki,
HaiboDing,JamieCallan,andGrahamNeubig.2022. IdaMele,CristinaIoanaMuntean,FrancoMariaNar-
Retrieval as attention: End-to-end learning of re- dini,RaffaelePerego,NicolaTonellotto,andOphir
trieval and reading within a single transformer. In Frieder.2020. Topicpropagationinconversational
Proc.EMNLP,pages2336–2349. search. InProc.SIGIR,pages2057–2060.

IdaMele,CristinaIoanaMuntean,FrancoMariaNar- Svitlana Vakulenko, Shayne Longpre, Zhucheng Tu,
dini,RaffaelePerego,NicolaTonellotto,andOphir andRavitejaAnantha.2021a. Questionrewritingfor
Frieder.2021. Adaptiveutterancerewritingforcon- conversationalquestionanswering. InProc.WSDM,
| versationalsearch. |     | InformationProcessing&Man- |     |     |     | pages355–363. |     |     |     |     |     |
| ------------------ | --- | -------------------------- | --- | --- | --- | ------------- | --- | --- | --- | --- | --- |
agement,page102682.
|     |     |     |     |     |     | SvitlanaVakulenko,      |     | NikosVoskarides, |                    | ZhuchengTu, |     |
| --- | --- | --- | --- | --- | --- | ----------------------- | --- | ---------------- | ------------------ | ----------- | --- |
|     |     |     |     |     |     | andShayneLongpre.2021b. |     |                  | Acomparisonofques- |             |     |
RodrigoNogueira,ZhiyingJiang,andJimmyLin.2020.
Document ranking with a pretrained sequence-to- tion rewriting methods for conversational passage
sequencemodel. InProc.EMNLP,pages708–718. retrieval. InProc.ECIR2021,page418–424.
Rodrigo Nogueira, Zhiying Jiang, and Jimmy Lin. Nikos Voskarides, Dan Li, Pengjie Ren, Evangelos
|     |     |     |     |     |     | Kanoulas,andMaartendeRijke.2020. |     |     |     | Queryreso- |     |
| --- | --- | --- | --- | --- | --- | -------------------------------- | --- | --- | --- | ---------- | --- |
2021. Investigatingthelimitationsofthetransform-
lutionforconversationalsearchwithlimitedsupervi-
| ers with | simple | arithmetic | tasks. | arXiv | preprint |     |     |     |     |     |     |
| -------- | ------ | ---------- | ------ | ----- | -------- | --- | --- | --- | --- | --- | --- |
sion. InProc.SIGIR,pages921–930.
arXiv:2102.13019.
WeishiWang,StevenC.H.Hoi,andShafiqJoty.2020.
PaulOwoicho,JeffreyDalton,MohammadAliannejadi,
|                                         |     |     |     |     |      | Response | selection |     | for multi-party | conversations |     |
| --------------------------------------- | --- | --- | --- | --- | ---- | -------- | --------- | --- | --------------- | ------------- | --- |
| LeifAzzopardi,andJohanneR.Trippas.2022. |     |     |     |     | CAsT |          |           |     |                 |               |     |
2022: Treccast2022goingbeyonduseraskandsys- withdynamictopictracking. InProc.EMNLP,pages
6581–6591.
temretrievewithinitiativeandresponsegeneration.
InProc.TREC.
|     |     |     |     |     |     | Thomas | Wolf, Lysandre |     | Debut, | Victor Sanh, | Julien |
| --- | --- | --- | --- | --- | --- | ------ | -------------- | --- | ------ | ------------ | ------ |
Chaumond,ClementDelangue,AnthonyMoi,Pier-
| Ronak Pradeep, |     | Rodrigo | Nogueira, | and | Jimmy Lin. |     |     |     |     |     |     |
| -------------- | --- | ------- | --------- | --- | ---------- | --- | --- | --- | --- | --- | --- |
ricCistac,TimRault,RemiLouf,MorganFuntowicz,
| 2021. | The expando-mono-duo |     |     | design | pattern for |     |     |     |     |     |     |
| ----- | -------------------- | --- | --- | ------ | ----------- | --- | --- | --- | --- | --- | --- |
JoeDavison,SamShleifer,PatrickvonPlaten,Clara
| text ranking | with                           | pretrained | sequence-to-sequence |     |     |                    |     |            |     |           |       |
| ------------ | ------------------------------ | ---------- | -------------------- | --- | --- | ------------------ | --- | ---------- | --- | --------- | ----- |
|              |                                |            |                      |     |     | Ma, YacineJernite, |     | JulienPlu, |     | CanwenXu, | Teven |
| models.      | arXivpreprintarXiv:2101.05667. |            |                      |     |     |                    |     |            |     |           |       |
LeScao,SylvainGugger,MariamaDrame,Quentin
|     |     |     |     |     |     | Lhoest, | and Alexander |     | Rush. | 2020. Transformers: |     |
| --- | --- | --- | --- | --- | --- | ------- | ------------- | --- | ----- | ------------------- | --- |
ChenQu,LiuYang,CenChen,MinghuiQiu,W.Bruce
|                           |     |     |                       |     |     | State-of-the-artnaturallanguageprocessing. |     |     |     |     | InProc. |
| ------------------------- | --- | --- | --------------------- | --- | --- | ------------------------------------------ | --- | --- | --- | --- | ------- |
| Croft,andMohitIyyer.2020. |     |     | Open-retrievalconver- |     |     |                                            |     |     |     |     |         |
EMNLP,pages38–45.
| sationalquestionanswering. |     |     | InProc.SIGIR,pages |     |     |     |     |     |     |     |     |
| -------------------------- | --- | --- | ------------------ | --- | --- | --- | --- | --- | --- | --- | --- |
539–548.
YichongXu,XiaodongLiu,YelongShen,JingjingLiu,
|          |           |         |      |          |        | and Jianfeng |     | Gao. 2019. | Multi-task | learning | with |
| -------- | --------- | ------- | ---- | -------- | ------ | ------------ | --- | ---------- | ---------- | -------- | ---- |
| Chen Qu, | Liu Yang, | Minghui | Qiu, | Yongfeng | Zhang, |              |     |            |            |          |      |
samplere-weightingformachinereadingcomprehen-
| Cen Chen, | W   | Bruce Croft, | and | Mohit Iyyer. | 2019. |     |     |     |     |     |     |
| --------- | --- | ------------ | --- | ------------ | ----- | --- | --- | --- | --- | --- | --- |
sion. InProc.NAACL,pages2644–2655.
| Attentivehistory |     | selectionfor                |     | conversational | ques- |     |     |     |     |     |     |
| ---------------- | --- | --------------------------- | --- | -------------- | ----- | --- | --- | --- | --- | --- | --- |
| tionanswering.   |     | InProc.CIKM,pages1391–1400. |     |                |       |     |     |     |     |     |     |
ShiYu,JiahuaLiu,JingqinYang,ChenyanXiong,Paul
|     |     |     |     |     |     | Bennett,JianfengGao,andZhiyuanLiu.2020. |     |     |     |     | Few- |
| --- | --- | --- | --- | --- | --- | --------------------------------------- | --- | --- | --- | --- | ---- |
ColinRaffel,NoamShazeer,AdamRoberts,Katherine
|     |     |     |     |     |     | shot generative |     | conversational |     | query rewriting. | In  |
| --- | --- | --- | --- | --- | --- | --------------- | --- | -------------- | --- | ---------------- | --- |
Lee,SharanNarang,MichaelMatena,YanqiZhou,
Proc.SIGIR,page1933–1936.
| WeiLi,andPeterJLiu.2020. |     |     |     | Exploringthelimits |     |     |     |     |     |     |     |
| ------------------------ | --- | --- | --- | ------------------ | --- | --- | --- | --- | --- | --- | --- |
oftransferlearningwithaunifiedtext-to-texttrans-
A Appendix
| former. | InProc.JMLR,pages1–67. |     |     |     |     |          |     |      |              |           |     |
| ------- | ---------------------- | --- | --- | --- | --- | -------- | --- | ---- | ------------ | --------- | --- |
|         |                        |     |     |     |     | Our code | and | data | are publicly | available | at  |
SivaReddy,DanqiChen,andChristopherDManning.
https://github.com/
| 2019. CoQA:Aconversationalquestionanswering |     |     |     |     |     | the following |     | URL: |     |     |     |
| ------------------------------------------- | --- | --- | --- | --- | --- | ------------- | --- | ---- | --- | --- | --- |
terrierteam/mtl_gen_class.
| challenge. | InProc.ACL,pages249–266. |     |     |     |     |     |     |     |     |     |     |
| ---------- | ------------------------ | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
GaryRen,XiaochuanNi,ManishMalik,andQifaKe. A.1 ADiscriminative+GenerativeMTL
| 2018. Conversationalqueryunderstandingusingse- |     |     |                  |     |     | Model       |     |                    |     |        |         |
| ---------------------------------------------- | --- | --- | ---------------- | --- | --- | ----------- | --- | ------------------ | --- | ------ | ------- |
| quencetosequencemodeling.                      |     |     | InProc.WWW,pages |     |     |             |     |                    |     |        |         |
| 1715–1724.                                     |     |     |                  |     |     | In addition | to  | the implementation |     | of the | genera- |
tiveMTLmodel,wealsoincorporateadiscrimina-
EstebanARíssola,ManajitChakraborty,FabioCrestani, tive+generativeMTLmodeltocapturetherelation-
| andMohammadAliannejadi.2019. |     |       |              | Predictingrel- |              |                         |     |     |     |                  |     |
| ---------------------------- | --- | ----- | ------------ | -------------- | ------------ | ----------------------- | --- | --- | --- | ---------------- | --- |
|                              |     |       |              |                |              | shipbetweenthequestionq |     |     | /q  | andthecontextual |     |
| evant conversation           |     | turns | for improved |                | retrieval in |                         |     |     | c   | m                |     |
multi-turnconversationalsearch. InProc.TREC. informationintheconversationhistory,whichin-
|     |     |     |     |     |     |            |            |             |     | q ,q ,...q |       |
| --- | --- | --- | --- | --- | --- | ---------- | ---------- | ----------- | --- | ---------- | ----- |
|     |     |     |     |     |     | cludes the | historical | question(s) |     | 1 2        | k and |
ISekulic´,MohammadAliannejadi,andFabioCrestani.
|     |     |     |     |     |     | thehistoricalanswer(s)a |     |     | ,a ,...a | ,asillustrated |     |
| --- | --- | --- | --- | --- | --- | ----------------------- | --- | --- | -------- | -------------- | --- |
|     |     |     |     |     |     |                         |     |     | 1 2      | k              |     |
2020. Extendingtheuseofpreviousrelevantutter-
|     |     |     |     |     |     | inFigure2(a). |     | Theinputsequenceofthediscrim- |     |     |     |
| --- | --- | --- | --- | --- | --- | ------------- | --- | ----------------------------- | --- | --- | --- |
ancesforresponserankinginconversationalsearch.
| InProc.TREC. |     |     |     |     |     | inative+generativeMTLmodelisthesameasthe |     |     |                      |     |     |
| ------------ | --- | --- | --- | --- | --- | ---------------------------------------- | --- | --- | -------------------- | --- | --- |
|              |     |     |     |     |     | oneshowninEquation(1).                   |     |     | Duringthefine-tuning |     |     |
TaihuaShao,FeiCai,WanyuChen,andHonghuiChen.
|     |     |     |     |     |     | process, | the LM | head | of the | model is | refined to |
| --- | --- | --- | --- | --- | --- | -------- | ------ | ---- | ------ | -------- | ---------- |
2022. Self-supervisedclarificationquestiongenera-
tionforambiguousmulti-turnconversation. Inf.Sci., generatethetargettokens,withatokensequence
|     |     |     |     |     |     | lengthdenotedasninEquation(2). |     |     |     | Incontrastto |     |
| --- | --- | --- | --- | --- | --- | ------------------------------ | --- | --- | --- | ------------ | --- |
page626–641.

srigouthamg/t5_paraphraser:3
| thegenerativeMTLmodel,thisapproachemploys |     |     |     |     | ram |     |     |     |     |
| ----------------------------------------- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
thetokensw ,...,w toencompasstheentireout- These models are configured as follows:4 the
1 n
putsequenceforthetargetquery. Simultaneously, maximum sequence length is set to 512, the
the CLS head (see details in Section 2.3) of the number of training epochs is set to 5, the batch
modelundergoesfine-tuningtopredicteither1or sizeissetto24,andweuseAdamoptimiserwith
0, signifying whether the candidate question is a alearningrateof0.00005.
validfollow-uptothepreviousquestionornot.
3InitialexperimentsfoundthisT5modelmoreeffective
WecompareourgenerativeBARTmodeltothe thantheoriginalt5-baseacrossanumberoftasks.
discriminative+generative BART variant in Sec- 4Settings https://github.com/
follow
gmihaila/ml_things/
tion4.1andSection4.2,toconcludeontheirperfor-
manceinboththefollow-upquestionidentification A.3 EvaluationMetrics
andconversationalquestionrewritingtasks.
Sincethefollow-upquestionidentificationisabi-
naryclassificationtask,weevaluateperformances
ModelTrainingDetails
Mathematicalsetting Section2.3,AppendixA.1 usingclassicalclassificationmetrics,namelypre-
| Sourcecode |     | https://github.com/ |     |     |     |     |     |     |     |
| ---------- | --- | ------------------- | --- | --- | --- | --- | --- | --- | --- |
terrierteam/mtl_gen_class cision, recall, F1 and Macro-F1. Indeed, follow-
| Computinginfrastructure |     | NVIDIARTXA6000GPU |     |     |     |     |     |     |     |
| ----------------------- | --- | ----------------- | --- | --- | --- | --- | --- | --- | --- |
Trainingtime 4h ing (Kundu et al., 2020), reporting Macro-F1 en-
Inferencetime 500ms ablesaccuracyontopicshiftdetectiontobemea-
| Batchsize |     | 24  |     |     |     |     |     |     |     |
| --------- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
Numberofparametersin 220M(MTLT5)140M(MTLBART) sured,whileF1focusessolelyonfollow-upidenti-
eachmodel
Evaluationmetrics AppendixA.2 ficationasthepositiveclass. WeuseMcNemar’s
Hyper-parameterExperiments testtomeasurestatisticallysignificantdifferences
| Theexactnumberoftrain- |     | AppendixA.2 |     |     |     |     |     |     |     |
| ---------------------- | --- | ----------- | --- | --- | --- | --- | --- | --- | --- |
ingandevaluationruns between the models’ classification performances.
| Bounds for     | each hyper- | Numberofepochs:1–5 |     |     |                    |     |                       |     |          |
| -------------- | ----------- | ------------------ | --- | --- | ------------------ | --- | --------------------- | --- | -------- |
| parameter      |             |                    |     |     | For the evaluation |     | of the conversational |     | question |
| Hyperparameter | con-        | AppendixA.2        |     |     |                    |     |                       |     |          |
figurations for best- rewriting performance, we adopt the ROUGE re-
| performingmodels     |     |         |                                  |     | callcalculatedforunigrams(ROUGE-1recall)and |     |     |     |     |
| -------------------- | --- | ------- | -------------------------------- | --- | ------------------------------------------- | --- | --- | --- | --- |
| Numberofhyperparame- |     | 1       |                                  |     |                                             |     |     |     |     |
| tersearchtrials      |     |         |                                  |     | BLEUmetrics,following(Vakulenkoetal.,2021a; |     |     |     |     |
| Themethodofchoosing  |     | Highest | question rewriting effectiveness |     |                                             |     |     |     |     |
hyper-parametervalues (ROUGE-1)onvalidationset Linetal.,2020;Elgoharyetal.,2019). Asforthe
| Dataset          |     |         |     |     | passageretrievalevaluation,weuseMeanAverage |     |     |     |     |
| ---------------- | --- | ------- | --- | --- | ------------------------------------------- | --- | --- | --- | --- |
| Datasetlanguages |     | English |     |     |                                             |     |     |     |     |
Number of examples in Table1 Precision(MAP),MeanReciprocalRank(MRR),
datasets
NormalizedDiscountedCumulativeGain(NDCG)
| Explanationofanydata |     | Section3.2 |     |     |     |     |     |     |     |
| -------------------- | --- | ---------- | --- | --- | --- | --- | --- | --- | --- |
thatwereexcluded, and andRecall@1000asmetrics. Foreachquery,the
allpre-processingsteps
Azipfilecontainingdata https://github.com/ top 1000 documents are considered. We use the
| orlinktoadownloadable |     | terrierteam/mtl_gen_class |     |     |     |     |     |     |     |
| --------------------- | --- | ------------------------- | --- | --- | --- | --- | --- | --- | --- |
pairedt-testfortestingsignificantdifferences.
versionofthedata
|         |                                   |     |     |     | Passage Retrieval |     | Pipeline:       | We use    | the PyTer- |
| ------- | --------------------------------- | --- | --- | --- | ----------------- | --- | --------------- | --------- | ---------- |
| Table4: | SummaryofReproducibilityCriteria. |     |     |     |                   |     |                 |           |            |
|         |                                   |     |     |     | rier (Macdonald   |     | and Tonellotto, | 2020)     | platform   |
|         |                                   |     |     |     | for indexing      | and | retrieving      | passages. | For pas-   |
A.2 HyperparameterSettings sage ranking, we incorporate BM25 with the
monoT5(Pradeepetal.,2021)re-ranker.
| We implement     |       | the BERT,           | GPT-2, BART,   | and    |                             |     |                     |     |          |
| ---------------- | ----- | ------------------- | -------------- | ------ | --------------------------- | --- | ------------------- | --- | -------- |
| T5 models        | using | the following       | PyTorch        | models |                             |     |                     |     |          |
|                  |       |                     |                |        | A.4 ReproducibilityCriteria |     |                     |     |          |
| from HuggingFace |       | (Wolf               | et al., 2020), | namely |                             |     |                     |     |          |
|                  |       |                     |                |        | Table 4 summarises          |     | the reproducibility |     | criteria |
| bert-base,       |       | facebook/bart-base, |                | and    |                             |     |                     |     |          |
questionsforthispaper.