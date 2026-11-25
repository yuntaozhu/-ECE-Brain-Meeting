Improving Open-Domain Dialogue Systems via Multi-Turn Incomplete
|     |     |     |     | Utterance |     | Restoration |     |     |     |     |     |     |
| --- | --- | --- | --- | --------- | --- | ----------- | --- | --- | --- | --- | --- | --- |
ZhufengPan1,2∗ KunBai2∗ YanWang2 † LianqiangZhou2 XiaojiangLiu2
|     |     | 1UniversityofCalifornia,LosAngeles |     |     |     |     |     | 2TencentAILab |     |     |     |     |
| --- | --- | ---------------------------------- | --- | --- | --- | --- | --- | ------------- | --- | --- | --- | --- |
panzhufeng@cs.ucla.edu
| {bookerbai, |     | brandenwang, |     |     | tomcatzhou, |                                             | kieranliu}@tencent.com |          |     |         |      |         |
| ----------- | --- | ------------ | --- | --- | ----------- | ------------------------------------------- | ---------------------- | -------- | --- | ------- | ---- | ------- |
|             |     | Abstract     |     |     |             | thoseincompleteutterancesbasedonpreviousut- |                        |          |     |         |      |         |
|             |     |              |     |     |             | terances.                                   | For                    | example, |     | A means | what | kind of |
3
| In multi-turn |            | dialogue,      | utterances    | do         | not al- |                                    |          |          |        |            |         |           |
| ------------- | ---------- | -------------- | ------------- | ---------- | ------- | ---------------------------------- | -------- | -------- | ------ | ---------- | ------- | --------- |
|               |            |                |               |            |         | dessert                            | matches  | B’s      | taste, | instead    | of what | kind of   |
| ways take     | the        | full form      | of sentences. |            | These   | shop                               |          |          |        |            |         |           |
|               |            |                |               |            |         |                                    | B likes. | Failing  | to     | understand | this    | utterance |
| incomplete    | utterances | will           | greatly       | reduce     | the     |                                    |          |          |        |            |         |           |
|               |            |                |               |            |         | would                              | be a     | disaster | for    | dialogue   | systems | to gen-   |
| performance   |            | of open-domain |               | dialogue   | sys-    |                                    |          |          |        |            |         |           |
|               |            |                |               |            |         | eratearelevantandcoherentresponse. |          |          |        |            |         | According |
| tems.         | Restoring  | more           | incomplete    | utterances |         |                                    |          |          |        |            |         |           |
from context could potentially help the sys- to our survey (details in Table 2), in about 60%
|               |     |               |     |            |     | conversations, |     | fully | comprehending |     | current | utter- |
| ------------- | --- | ------------- | --- | ---------- | --- | -------------- | --- | ----- | ------------- | --- | ------- | ------ |
| tems generate |     | more relevant |     | responses. | To  |                |     |       |               |     |         |        |
facilitate the study of incomplete utterance ance depends on previous context. We will refer
restorationforopen-domaindialoguesystems,
|     |     |     |     |     |     | conversationhistory(A |     |     |     | toB | inaboveexample) |     |
| --- | --- | --- | --- | --- | --- | --------------------- | --- | --- | --- | --- | --------------- | --- |
|     |     |     |     |     |     |                       |     |     | 1   | 2   |                 |     |
a large-scale multi-turn dataset Restoration- aspreviousutterances,theutterancetoberestored
| 200K1 | iscollectedandmanuallylabeledwith |     |     |     |     |     |     |     |     |     |     |     |
| ----- | --------------------------------- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
(A )asoriginalutterance,andthecompleteform
3
| the explicit | relation | between | an  | utterance | and |     |     |     |     |     |     |     |
| ------------ | -------- | ------- | --- | --------- | --- | --- | --- | --- | --- | --- | --- | --- |
ofA asrestoredutterance.
| its context. |     | We also | propose | a “pick-and- |     | 3   |     |     |     |     |     |     |
| ------------ | --- | ------- | ------- | ------------ | --- | --- | --- | --- | --- | --- | --- | --- |
combine” model to restore the incomplete ut- Studies show that restoring the incomplete
terancefromitscontext. Experimentalresults questions could help question-answering systems
demonstratethattheannotateddatasetandthe better understand users’ intention (Raghu et al.,
proposed approach significantly boost the re- 2015; Kumar and Joshi, 2017). It inspires us
| sponse | quality | of both | single-turn | and | multi- |            |     |                 |     |     |             |     |
| ------ | ------- | ------- | ----------- | --- | ------ | ---------- | --- | --------------- | --- | --- | ----------- | --- |
|        |         |         |             |     |        | to improve |     | the performance |     | of  | open-domain | di- |
turndialoguesystems.
|     |     |     |     |     |     | alogue | systems  | via  | incomplete |            | utterance | restora- |
| --- | --- | --- | --- | --- | --- | ------ | -------- | ---- | ---------- | ---------- | --------- | -------- |
|     |     |     |     |     |     | tion.  | However, | most | existing   | multi-turn |           | dialogue |
1 Introduction
|     |     |     |     |     |     | datasets | only | provide | sets | of  | utterances, | with- |
| --- | --- | --- | --- | --- | --- | -------- | ---- | ------- | ---- | --- | ----------- | ----- |
Dialogue systems have attracted increasing atten- outanyinformationaboutrelationsbetweenutter-
tion due to the promising potentials on applica- ances. Inotherwords, theylackthenecessarysu-
tions like virtual assistants or customer support pervisionstorestoretheincompleteutterance.
systems(Hauswaldetal.,2015;PoulamiDebnath, Tomakedialoguesystemsbetterunderstandin-
| 2018). However, |             | studies | (Carbonell, | 1983) | show        |           |             |     |               |         |              |      |
| --------------- | ----------- | ------- | ----------- | ----- | ----------- | --------- | ----------- | --- | ------------- | ------- | ------------ | ---- |
|                 |             |         |             |       |             | complete  | utterances, |     | we            | collect | a multi-turn | con- |
| that users      | of dialogue | systems |             | tend  | to use suc- |           |             |     |               |         |              |      |
|                 |             |         |             |       |             | versation | dataset     |     | from internet |         | communities, | and  |
cinct language which often omits entities or con- each of the conversations contains at least six ut-
ceptsmadeinpreviousutterances. (alsoknownas terances. Then we hire an annotation team to (1)
non-sententialutterances,(Ferna´ndezetal.,2005,
|     |     |     |     |     |     | labelwhetheran |     | utteranceisrelatedto |     |     |     | itscontext |
| --- | --- | --- | --- | --- | --- | -------------- | --- | -------------------- | --- | --- | --- | ---------- |
2007)). To make appropriate responses, dialogue ornot,and(2)restoreanincompleteutterancetoa
systems must be equipped with the ability to un- complete and context-free form based on its con-
derstandtheseincompleteutterances.
text. Finally,wegetahigh-qualityandlarge-scale
| Take Example |     | 1 in Table | 1   | for instance, | con- |         |      |      |           |                |     |      |
| ------------ | --- | ---------- | --- | ------------- | ---- | ------- | ---- | ---- | --------- | -------------- | --- | ---- |
|              |     |            |     |               |      | dataset | with | 200K | annotated | conversations. |     | Such |
tentsinparenthesesareinformationomittedinthe adatasetoffersanewwayofmodellingutterance
utterance. Humansarecapableofcomprehending relationsandimprovingthecontext-understanding
|     |     |     |     |     |     | ability | of dialogue |     | systems. |     | We hope | it would |
| --- | --- | --- | --- | --- | --- | ------- | ----------- | --- | -------- | --- | ------- | -------- |
∗Bothauthorscontributedequallytothework.Thework
|     |     |     |     |     |     | benefit | the | research | of context |     | understanding | for |
| --- | --- | --- | --- | --- | --- | ------- | --- | -------- | ---------- | --- | ------------- | --- |
wasconductedwhenZhufengPanwasinterningatTencent
| AILab. |     |     |     |     |     | multi-turndialoguesystemsinthefuture. |     |     |     |     |     |     |
| ------ | --- | --- | --- | --- | --- | ------------------------------------- | --- | --- | --- | --- | --- | --- |
†Correspondingauthor
|                           |     |     |                     |     |     | With | the | annotated | dataset |     | above, | we first at- |
| ------------------------- | --- | --- | ------------------- | --- | --- | ---- | --- | --------- | ------- | --- | ------ | ------------ |
| 1Thedatasetisavailableat: |     |     | https://ai.tencent. |     |     |      |     |           |         |     |        |              |
com/ailab/nlp/dialogue/datasets/ tempt to restore the incomplete utterance using
1824
Proceedingsofthe2019ConferenceonEmpiricalMethodsinNaturalLanguageProcessing
andthe9thInternationalJointConferenceonNaturalLanguageProcessing,pages1824–1833,
HongKong,China,November3–7,2019.(cid:13)c2019AssociationforComputationalLinguistics

Example 1 Example 2 Example 3
今天买了一堆桌游有爱玩的可以一起
我能在巴黎哪个地方学做甜品？ 我们一起过个情人节吧
A I bought a bunch of board game. Welcome
1 Where can I learn to make dessert in Paris? Shall we spend Valentine’s Day together
anybody who also likes to playit
为什么(你想学做甜品)啊？ 我比较喜欢卡卡颂和现代艺术 头像都一样在一起吧。
B
1 Why (do you want to learn to make dessert)? I like Carcassonne and Modern Art Let’s date since we have the same avatar
因为我想在(巴黎)这儿开个甜品店
听说过不过没买 在一起不错的选择
A Because I want to open a dessert shop here
2 Heard of it. But I haven’t bought it Dating is a good choice
(in Paris)
(在巴黎开甜品店)不错啊，我很喜欢甜点！
我有 赞
B (Opening a dessert shop in Paris) Sounds great,
2 No problem, I have Cool
I love dessert!
你最喜欢哪一种? 一起啊 人呢
A
3 Which kind matches your taste most? Let’s do it together Where are you?
Label 1 1 0
你最喜欢哪一种甜品? 一起玩桌游啊 人呢
Reference
Which kind of dessertmatches your taste most? Let’s play board gametogether Where are you?
Table1: Examplesfromthedataset. Ifannotatorsjudgethefifthutterance(A )omitsconceptsorentitiesmadein
3
previousutteranceslikeExample1and2,theyrewritetheutteranceasgroundtruthreference.
twovanillamodels,Sequence-to-Sequencemodel modelsandanewmetricarepresentedforincom-
(Seq2Seq)andPointerGenerativeNetwork. Then pleteutterancerestoration. Section4showsexper-
a cascaded pick-and-combine model is further imental results on both automatic metrics and hu-
proposed to first “Pick” omitted words from con- man evaluation for the proposed method. In Sec-
textandthen“Combine”themwiththeincomplete tion 5 the proposed model is applied to dialogue
utterance. To better evaluate the restoration per- systemstoevaluateitseffectiveness. Section6in-
formance, an evaluation metric is also designed. troducesrelatedwork. Weconcludeourworkand
Intheexperiment,bothautomaticmetricsandhu- discussfuturedirectionsinSection7.
man evaluation show that the proposed approach
2 Restoration-200K
could achieve promising results and significantly
improvetheresponserelevanceofbothsingle-turn
2.1 DataCollection
dialoguesystemsandmulti-turndialoguesystems.
We collect open-domain dialogues from Douban
Theproposedapproachenablessingle-turndia-
group2, a well-known Chinese online community
logue systems with the capability to comprehend
which is a common data source for dialogue sys-
the dialogue context. It also facilitates multi-turn
tems (Wu et al., 2017). To determine if one ut-
dialogue systems to model the relation between
teranceiscompleteornot,wetakefourutterances
the query (original utterance) and context (previ-
beforeitastheconversationcontext. Crawledcon-
ous utterances) explicitly in a supervised manner,
versationswithlessthansix(extraonetoassistan-
incontrasttomodellingtherelationimplicitlyand
notation)utterancesarefilteredout. Forconversa-
without extra guidance (Serban et al., 2016; Wu
tions with more than six utterances, only the first
etal.,2017).
six are reserved. We construct a conversation by
Ourcontributionsaresummarizedasbelow:
theidentificationofreplytagsincommentsunder
1) A large-scale Chinese dataset with 200K
eachpost.
multi-turn conversations are collected and manu-
allylabeledwiththeexplicitrelationsbetweenan
2.2 DataAnnotation
utteranceanditscontext.
Toensuretheannotationquality,fiveprofessional
2) A cascaded pick-and-combine model is pro-
data annotators are hired to annotate the dataset
posed, which achieves promising results on both
instead of using crowd-sourcing platforms like
automaticmetricsandhumanevaluation.
MTurk. It took six months to finish the annota-
3) Experimental results demonstrate that the
tion. As shown in Figure 1, annotators first dis-
incomplete utterance restoration model could be
cern whether the original utterance (the fifth ut-
complementary to existing dialogue systems and
teranceinconversation)omitsconceptsorentities
isconduciveforimprovingresponsequality.
made in previous utterances. Since the boundary
In the remaining part, we first describe the col-
lected dataset in Section 2. In Section 3, several 2https://www.douban.com/group
1825

|     |     |     |     | train | val | test |     |     |     | Restored utterance: What kind of  |     |     |     |
| --- | --- | --- | --- | ----- | --- | ---- | --- | --- | --- | --------------------------------- | --- | --- | --- |
dessertmatches your taste most?
| #conversations     |                 |     |                   | 194k | 5k   | 5k     |         |     |     |     |           |     |         |
| ------------------ | --------------- | --- | ----------------- | ---- | ---- | ------ | ------- | --- | --- | --- | --------- | --- | ------- |
| Incompleteratio(%) |                 |     |                   | 60.1 | 59.4 | 58.8   | pointer |     |     |     |           |     |         |
| Vocabularysize     |                 |     |                   | 80k  | 15k  | 15k    |         |     |     |     |           |     | Seq2Seq |
| Avg.               | contextlength   |     |                   | 25.9 | 25.8 | 25.7   |         |     |     |     |           |     |         |
| Avg.               | utterancelength |     |                   | 8.62 | 8.53 | 8.60   |         |     |     |     |           |     |         |
| Avg.               | referencelength |     |                   | 12.4 | 12.3 | 12.4   |         |     |     |     | Attention |     |         |
| Table 2:           | Statistics      | of  | Restoration-200K. |      | The  | incom- |         |     |     |     |           |     |         |
pleteratioreferstotheratioofconversationsthatcon-
copy
tains the incomplete utterance. Vocabulary size is distribution Previous utterances Original utterance
| counted                               | after Chinese |     | word segmentation |     | and | the av- |                                                        |     |     |        |     |     |     |
| ------------------------------------- | ------------- | --- | ----------------- | --- | --- | ------- | ------------------------------------------------------ | --- | --- | ------ | --- | --- | --- |
| eragelengthiscountedoncharacterlevel. |               |     |                   |     |     |         |                                                        |     |     | concat |     |     |     |
|                                       |               |     |                   |     |     |         | Previous utterances: … make dessertin Paris [SEP] Why? |     |     |        |     |     | …   |
Original utterance: What kind matches your taste most?
betweenyesandnoisvagueundercertaincircum-
|     |     |     |     |     |     |     | Figure 1: | The | architecture |     | of Seq2Seq |     | model and |
| --- | --- | --- | --- | --- | --- | --- | --------- | --- | ------------ | --- | ---------- | --- | --------- |
stances,annotatorsareallowedtoskipanddiscard
pointergenerativenetwork.
| the instance    | if  | it is hard | to       | make a | decision. | The     |     |     |     |     |     |     |     |
| --------------- | --- | ---------- | -------- | ------ | --------- | ------- | --- | --- | --- | --- | --- | --- | --- |
| sixth utterance |     | is also    | provided | to     | assist    | annota- |     |     |     |     |     |     |     |
tors in comprehending the conversation. When erative network. Since these two models are
restoration is needed, they rewrite the original ut- easily dominated by a simple copy mechanism
terance to a context-free restored utterance which that directly regenerates the original utterance as
| contains | all necessary |     | information |     | for utterance |     |              |            |     |     |         |         |        |
| -------- | ------------- | --- | ----------- | --- | ------------- | --- | ------------ | ---------- | --- | --- | ------- | ------- | ------ |
|          |               |     |             |     |               |     | the restored | utterance, |     | we  | further | propose | a cas- |
understanding,asshowninthelastrowofTable1. caded pick-and-combine (PAC) model to restore
| To reduce | the | diversity |     | of rewritten | sentences, |     | theoriginalutterance. |     |     |     |     |     |     |
| --------- | --- | --------- | --- | ------------ | ---------- | --- | --------------------- | --- | --- | --- | --- | --- | --- |
annotatorsareinstructedtousewordsfromprevi-
ous utterances wherever possible. A small com- 3.1 VanillaModels
| monly used | word  | list  | is provided, |        | and annotators |     |         |       |      |            |     |     |         |
| ---------- | ----- | ----- | ------------ | ------ | -------------- | --- | ------- | ----- | ---- | ---------- | --- | --- | ------- |
|            |       |       |              |        |                |     | Seq2Seq | Model | with | Attention: |     | the | Seq2Seq |
| could use  | those | words | to           | ensure | the fluency    | of  |         |       |      |            |     |     |         |
frameworkhasbeenwidelyusedinsequencegen-
| rewritten                             | sentences.  |                              | In other | words,           | all      | words   |                 |        |        |                |          |          |            |
| ------------------------------------- | ----------- | ---------------------------- | -------- | ---------------- | -------- | ------- | --------------- | ------ | ------ | -------------- | -------- | -------- | ---------- |
|                                       |             |                              |          |                  |          |         | eration         | tasks. | The    | encoder        | encodes  | the      | input se-  |
| in the restored                       |             | utterance                    | come     | from             | previous | and     |                 |        |        |                |          |          |            |
|                                       |             |                              |          |                  |          |         | quence          | into a | vector | representation |          | c and    | the de-    |
| originalutterancesortheextrawordlist. |             |                              |          |                  |          | Oursur- |                 |        |        |                |          |          |            |
|                                       |             |                              |          |                  |          |         | coder generates |        | the    | target         | sequence | based    | on rep-    |
| vey shows                             | only        | about                        | 4.8%     | of conversations |          | that    |                 |        |        |                |          |          |            |
|                                       |             |                              |          |                  |          |         | resentation     | vector | c,     | and            | all the  | previous | words.     |
| need to                               | be restored |                              | in the   | dataset          | do not   | satisfy |                 |        |        |                |          |          |            |
|                                       |             |                              |          |                  |          |         | As shown        | in     | Figure | 1, to          | restore  | the      | incomplete |
| suchcondition.                        |             | Allofthemarediscardedaswell. |          |                  |          |         |                 |        |        |                |          |          |            |
C
|     |     |     |     |     |     |     | utterance, | we       | concatenate |     | previous | utterances |           |
| --- | --- | --- | --- | --- | --- | --- | ---------- | -------- | ----------- | --- | -------- | ---------- | --------- |
|     |     |     |     |     |     |     | and the    | original | utterance   |     | X        | as the     | input se- |
2.3 DataStatistics
|                  |                |                            |                  |             |          |         | quence.   | By         | inserting  | a               | special   | token       | [sep] to    |
| ---------------- | -------------- | -------------------------- | ---------------- | ----------- | -------- | ------- | --------- | ---------- | ---------- | --------------- | --------- | ----------- | ----------- |
| The statistics   |                | of train,                  | validation       | and         | test     | set are |           |            |            |                 |           |             |             |
|                  |                |                            |                  |             |          |         | separate  | C and      | X,         | the input       | sequence  |             | will be:    |
| showninTable2.   |                | KumarandJoshi(2016)collect |                  |             |          |         |           |            |            |                 |           |             |             |
|                  |                |                            |                  |             |          |         | [c ,...,c | ,[sep],x   |            | ,...x           | ].        |             |             |
|                  |                |                            |                  |             |          |         | 1         | t1         |            | 1               | t2        |             |             |
| 6K incomplete    |                | questions                  | for              | QA systems, |          | where   |           |            |            |                 |           |             |             |
|                  |                |                            |                  |             |          |         | Pointer   | Generative |            | Network:        |           | as analyzed | in          |
| each utterance   |                | only                       | consists         | of 3.52     | words    | on av-  |           |            |            |                 |           |             |             |
|                  |                |                            |                  |             |          |         | Section   | 2.2, the   | incomplete |                 | utterance |             | restoration |
| erage3.          | In comparison, |                            | Restoration-200K |             |          | has a   |           |            |            |                 |           |             |             |
|                  |                |                            |                  |             |          |         | problem   | has a      | unique     | characteristic: |           | most        | gener-      |
| longer utterance |                | length,                    | which            | indicates   | covering |         |           |            |            |                 |           |             |             |
atedwordscomefrompreviousutterancesororig-
| a broader | range | of  | topics | and more | informative |     |                 |     |            |     |                  |     |         |
| --------- | ----- | --- | ------ | -------- | ----------- | --- | --------------- | --- | ---------- | --- | ---------------- | --- | ------- |
|           |       |     |        |          |             |     | inal utterance. |     | To exploit |     | this constraint, |     | we pro- |
contents.
|               |     |     |     |     |     |     | pose using                           | the | pointer    | generative |       | network | to di-     |
| ------------- | --- | --- | --- | --- | --- | --- | ------------------------------------ | --- | ---------- | ---------- | ----- | ------- | ---------- |
| 3 Methodology |     |     |     |     |     |     | rectlycopywordsfromtheinputsequence. |     |            |            |       |         | Ithas      |
|               |     |     |     |     |     |     | the capability                       |     | of copying |            | words | from    | source se- |
Inthissection,wetrytotackletheincompleteut-
|     |     |     |     |     |     |     | quencebydirectlytakingtheattentionscorea |     |     |     |     |     | as  |
| --- | --- | --- | --- | --- | --- | --- | ---------------------------------------- | --- | --- | --- | --- | --- | --- |
k
| terance | restoration | problem |     | by using | the | vanilla |            |              |     |          |     |        |            |
| ------- | ----------- | ------- | --- | -------- | --- | ------- | ---------- | ------------ | --- | -------- | --- | ------ | ---------- |
|         |             |         |     |          |     |         | prediction | probability, |     | as shown |     | in the | green part |
Seq2Seq model with attention and pointer gen- of Figure 1. The generation distribution P can
gen
|     |     |     |     |     |     |     | be calculated |     | as: P | =   | f(h∗,s | ,y  | ), p = |
| --- | --- | --- | --- | --- | --- | --- | ------------- | --- | ----- | --- | ------ | --- | ------ |
3The average sentence length is estimated based on the gen t t t gen
releasedtestset. g(h∗ ,s ,y ). Andthefinalvocabularydistribution
|     |     |     |     |     |     |     | t t | t   |     |     |     |     |     |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
1826

restorestheoriginalutterancebasedontheidenti-
| Combine |     | Restored utterance: What kind      |     |     |     |     |                   |          |     |        |          |     |             |
| ------- | --- | ---------------------------------- | --- | --- | --- | --- | ----------------- | -------- | --- | ------ | -------- | --- | ----------- |
|         |     | of dessertmatches your taste most? |     |     |     |     | fiedomittedwords. |          |     |        |          |     |             |
|         |     |                                    |     |     |     |     | Pick:             | inspired | by  | recent | advances |     | in transfer |
Pointer Generative Network
learningforlanguagerepresentation,wefine-tune
|          |                    |     |     | +…  |     |     | thepre-traineddeepbidirectionaltransformersfor |               |     |     |       |        |         |
| -------- | ------------------ | --- | --- | --- | --- | --- | ---------------------------------------------- | ------------- | --- | --- | ----- | ------ | ------- |
| Previous | Original utterance |     |     |     | N P | N … |                                                |               |     |     |       |        |         |
|          |                    |     |     |     |     |     | language                                       | understanding |     |     | model | (BERT) | (Devlin |
etal.,2019)asaclassifiertoselectomittedwords
…
|      |          | N    |         | P   | N   |     |                |                                    |             |     |               |           |         |
| ---- | -------- | ---- | ------- | --- | --- | --- | -------------- | ---------------------------------- | ----------- | --- | ------------- | --------- | ------- |
|      |          |      |         |     |     |     | from previous  |                                    | utterances. |     | Specifically, |           | instead |
|      |          |      |         |     |     |     | of discrete    | classifications,                   |             |     | we first      | formulate | this    |
| Pick |          |      |         |     | in  | …   |                |                                    |             |     |               |           |         |
|      | Context: | make | dessert |     |     |     |                |                                    |             |     |               |           |         |
|      |          |      |         |     |     |     | word selection |                                    | problem     |     | as a sequence |           | tagging |
|      |          |      |         |     |     |     | problem.       | Eachwordinpreviousutteranceswillbe |             |     |               |           |         |
BERT
|     |     |     |     |     |     |     | determined                  | to  | be positive |     | P (should | be            | identified |
| --- | --- | --- | --- | --- | --- | --- | --------------------------- | --- | ----------- | --- | --------- | ------------- | ---------- |
|     |     |     |     |     |     |     | asanomittedword)ornegativeN |     |             |     |           | (notanomitted |            |
word).
|     |                     |     |     |                    |     |     | Combine:     | the | combine |       | stage is | straightforward. |        |
| --- | ------------------- | --- | --- | ------------------ | --- | --- | ------------ | --- | ------- | ----- | -------- | ---------------- | ------ |
|     | Previous utterances |     |     | Original utterance |     |     |              |     |         |       |          |                  |        |
|     |                     |     |     |                    |     |     | The selected |     | omitted | words | are      | appended         | to the |
concat
|     |     |     |     |     |     |     | input sequence |     | as  | extra | guidance. | And | the two |
| --- | --- | --- | --- | --- | --- | --- | -------------- | --- | --- | ----- | --------- | --- | ------- |
Previous utterances: … make dessertin Paris [SEP] Why?… sequences are taken as input of the pointer gen-
Original utterance: What kind matches your taste most? erativenetworkmentionedinSection3.1. Wealso
triedtofine-tunetheBERTtodirectlygeneratethe
| Figure2:         | Thepickstagepredictswhichwordsinpre- |             |           |              |     |            |            |            |     |         |          |        |           |
| ---------------- | ------------------------------------ | ----------- | --------- | ------------ | --- | ---------- | ---------- | ---------- | --- | ------- | -------- | ------ | --------- |
|                  |                                      |             |           |              |     |            | restored   | utterance, |     | but the | result   | is far | from sat- |
| vious utterances |                                      | are omitted | by        | the original |     | utterance. |            |            |     |         |          |        |           |
|                  |                                      |             |           |              |     |            | isfactory. | Therefore, |     | we      | directly | append | selected  |
| P represents     | the                                  | label of    | positive, | namely       | the | omitted    |            |            |     |         |          |        |           |
wordstotheoriginalinputsequenceasextraguid-
words.Incombinestage,thepickingresultisappended
tooriginalconversationasextraguidanceforthecom- anceforgeneratingrestoredsentences.
pleteutterancesequencegeneration.
3.3 TaskEvaluation
|     |     |     |     |     |     |     | BLEU | (Papineni | et  | al., 2002) | and | ROUGE | (Lin, |
| --- | --- | --- | --- | --- | --- | --- | ---- | --------- | --- | ---------- | --- | ----- | ----- |
P isdefinedas:
vocab
|     |     |     |     |     |     |     | 2004) | are commonly |     | used | metrics | in  | machine |
| --- | --- | --- | --- | --- | --- | --- | ----- | ------------ | --- | ---- | ------- | --- | ------- |
P vocab = p gen ∗P gen +(1−p gen )∗P copy translation and summarization. However, for the
|     |     |     |     |     |     |     | task of | incomplete |               | utterance | restoration, |     | these      |
| --- | --- | --- | --- | --- | --- | --- | ------- | ---------- | ------------- | --------- | ------------ | --- | ---------- |
|     |     |     |     |     |     |     | metrics | do not     | differentiate |           | words        | in  | the origi- |
3.2 Pick-and-CombineModel
|               |            |              |       |          |          |         | nal utterance |      | from       | those | in previous     |     | utterances, |
| ------------- | ---------- | ------------ | ----- | -------- | -------- | ------- | ------------- | ---- | ---------- | ----- | --------------- | --- | ----------- |
| For most      | utterances | to           | be    | restored | in the   | corpus, |               |      |            |       |                 |     |             |
|               |            |              |       |          |          |         | and each      | gram | is equally |       | important.      |     | The statis- |
| the reference |            | only differs | from  | the      | original | utter-  |               |      |            |       |                 |     |             |
|               |            |              |       |          |          |         | tics in Table |      | 2 show     | that  | most words      | in  | the refer-  |
| ance in       | few words. | Our          | study | shows    | on       | average |               |      |            |       |                 |     |             |
|               |            |              |       |          |          |         | ence overlap  |      | with words |       | in the original |     | utterance.  |
only 17.7% words in previous utterances overlap Thus,asimplecopymechanismwhichregenerates
| with the     | restored  | utterance, |              | while | 100%   | words in |              |           |     |     |          |           |       |
| ------------ | --------- | ---------- | ------------ | ----- | ------ | -------- | ------------ | --------- | --- | --- | -------- | --------- | ----- |
|              |           |            |              |       |        |          | the original | utterance |     | as  | restored | utterance | would |
| the original | utterance |            | are included |       | in the | restored |              |           |     |     |          |           |       |
achieveahighscoreonthesemetrics.
| utterance. | Such | unbalanced |     | probability |     | makes |              |     |      |        |            |     |          |
| ---------- | ---- | ---------- | --- | ----------- | --- | ----- | ------------ | --- | ---- | ------ | ---------- | --- | -------- |
|            |      |            |     |             |     |       | To alleviate |     | this | issue, | we propose | the | restora- |
modelsmentionedabovetendtosimplyregenerate
|     |     |     |     |     |     |     | tion score | to  | evaluate | the | performance |     | of incom- |
| --- | --- | --- | --- | --- | --- | --- | ---------- | --- | -------- | --- | ----------- | --- | --------- |
theoriginalutterancetomaximizetheconditional
|             |     |               |     |          |        |     | plete utterance |     | restoration |     | model. | This | metric fo- |
| ----------- | --- | ------------- | --- | -------- | ------ | --- | --------------- | --- | ----------- | --- | ------ | ---- | ---------- |
| probability | of  | the generated |     | sentence | during | the |                 |     |             |     |        |      |            |
cusesonn-gramsthatcontainatleastonerestored
| beam-searchprocess. |         |            | Inotherwords,theSeq2Seq |         |        |        |                 |             |       |            |         |               |         |
| ------------------- | ------- | ---------- | ----------------------- | ------- | ------ | ------ | --------------- | ----------- | ----- | ---------- | ------- | ------------- | ------- |
|                     |         |            |                         |         |        |        | word, excluding |             | other | n-grams.   |         | Specifically, | the     |
| model and           | pointer | generative |                         | network | tend   | to re- |                 |             |       |            |         |               |         |
|                     |         |            |                         |         |        |        | n-gram          | restoration |       | precision, | recall, | and           | F-score |
| generate            | the     | original   | utterance               | and     | cannot | effec- |                 |             |       |            |         |               |         |
canbecalculatedas:
| tivelyrestoretheoriginalutterance. |     |     |     |     | Thethirdcon- |     |     |     |     |     |     |     |     |
| ---------------------------------- | --- | --- | --- | --- | ------------ | --- | --- | --- | --- | --- | --- | --- | --- |
versationinTable5isatypicalexample. |{restoredn-grams}∩{n-gramsinref}|
p =
Tomitigatethisproblem,weproposetodecom- n |{restoredn-grams}|
posetheincompleteutterancerestorationtaskinto |{restoredn-grams}∩{n-gramsinref}|
| acascadedprocess. |            | ThefirststageisthePickpro- |     |       |             |     | r = |     |                  |     |     |     |     |
| ----------------- | ---------- | -------------------------- | --- | ----- | ----------- | --- | --- | --- | ---------------- | --- | --- | --- | --- |
|                   |            |                            |     |       |             |     | n   |     | |{n-gramsinref}| |     |     |     |     |
| cess that         | identifies | omitted                    |     | words | in previous | ut- |     |     |                  |     |     |     |     |
p n ·r n
f = 2·
| terances. | The | second | is the | Combine |     | stage that | n   |     |     |     |     |     |     |
| --------- | --- | ------ | ------ | ------- | --- | ---------- | --- | --- | --- | --- | --- | --- | --- |
p n +r n
1827

| Model | p   | r   |     | f p |     | r   | f p | r   | f   | B   | B   | R   | R   |
| ----- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
|       |     | 1   | 1   | 1   | 2   | 2   | 2 3 | 3   | 3   | 1   | 2   | 1   | 2   |
Syntactic 67.4 37.2 47.9 53.9 30.3 38.8 45.3 25.3 32.5 84.1 81.2 89.3 80.6
Seq2Seq 65.5 40.8 50.3 52.2 32.6 40.1 43.6 27.0 33.4 84.9 81.7 88.8 80.3
Pointer 66.6 40.4 50.3 54.0 33.1 41.1 45.9 28.1 34.9 84.7 81.7 89.0 80.9
PAC 70.5 58.1 63.7 55.4 45.1 49.7 45.2 36.6 40.4 89.9 86.3 91.6 82.8
Table 3: p, r, f here represent the restoration precision, recall and F-score that we propose in Section 3.3. B
n
| representsn-gramBLEUscoreandR |     |     |     | representsn-gramROUGEscore. |     |     |     |     |     |     |     |     |     |
| ----------------------------- | --- | --- | --- | --------------------------- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
n
|                 |     |          |       |        |         |     |     | Method |     | Quality | Fluency |     |     |
| --------------- | --- | -------- | ----- | ------ | ------- | --- | --- | ------ | --- | ------- | ------- | --- | --- |
| where “restored |     | n-grams” | refer | to the | n-grams | in  |     |        |     |         |         |     |     |
restoredutterancethatcontainatleastonerestored Syntactic 2.25 2.58
| words,and“n-gramsinref”refertothen-gramsin |     |     |     |     |     |     |     | Seq2Seq |     | 2.45 | 2.37 |     |     |
| ------------------------------------------ | --- | --- | --- | --- | --- | --- | --- | ------- | --- | ---- | ---- | --- | --- |
reference that contain at least one restored words, Pointer 2.53 2.50
| |X|referstothenumberofelementsinsetX. |     |     |     |     |     |     |     | PAC |     | 2.89 | 2.51 |     |     |
| ------------------------------------- | --- | --- | --- | --- | --- | --- | --- | --- | --- | ---- | ---- | --- | --- |
4 Experiment Table 4: Human evaluation on the restoration quality
|     |     |     |     |     |     |     | and language |     | fluency. | The quality | score | adopts | a 4- |
| --- | --- | --- | --- | --- | --- | --- | ------------ | --- | -------- | ----------- | ----- | ------ | ---- |
4.1 Comparedmethods
|     |     |     |     |     |     |     | pointscale,andfluencyscoreadoptsa3-pointscale. |     |     |     |     |     | A   |
| --- | --- | --- | --- | --- | --- | --- | ---------------------------------------------- | --- | --- | --- | --- | --- | --- |
higherscoreisbetterforboth.
| We compare | the | performance |     | of the | following |     |     |     |     |     |     |     |     |
| ---------- | --- | ----------- | --- | ------ | --------- | --- | --- | --- | --- | --- | --- | --- | --- |
methodsonthecollecteddataset:
|              |     |       |          |     |       |      | 4.2 | Evaluationmetrics |     |     |     |     |     |
| ------------ | --- | ----- | -------- | --- | ----- | ---- | --- | ----------------- | --- | --- | --- | --- | --- |
| • Syntactic: |     | model | proposed | by  | Kumar | (Ku- |     |                   |     |     |     |     |     |
mar and Joshi, 2016). Specifically, they re- The n-gram restoration score proposed in Sec-
placeeachout-of-vocabularywordinthecor-
|     |     |     |     |     |     |     | tion 3.3 | is  | adopted | as the | automatic | evaluation |     |
| --- | --- | --- | --- | --- | --- | --- | -------- | --- | ------- | ------ | --------- | ---------- | --- |
pus with a numbered unknown token. The metrics. Then human evaluation is further con-
numberisbasedonitsrelativepositioninthe ducted. Specifically, human annotators are in-
conversation. The model itself is a Seq2Seq structed to evaluate the quality and fluency of re-
modelwithattention.
|            |     |             |     |            |           |     | stored       | utterances. |            | The quality  | score      | evaluates  | if    |
| ---------- | --- | ----------- | --- | ---------- | --------- | --- | ------------ | ----------- | ---------- | ------------ | ---------- | ---------- | ----- |
|            |     |             |     |            |           |     | the restored |             | utterances | can          | be better  | understood |       |
| • Seq2Seq: |     | the Seq2Seq |     | model with | attention |     |              |             |            |              |            |            |       |
|            |     |             |     |            |           |     | without      | context     | than       | the original | utterance. |            | A re- |
introducedinSection3.1.
storedutteranceshouldbescored4ifitcanbeper-
fectlyunderstoodwithoutpreviousutterances,3if
| • Pointer: | the | pointer | generative |     | network | in- |     |     |     |     |     |     |     |
| ---------- | --- | ------- | ---------- | --- | ------- | --- | --- | --- | --- | --- | --- | --- | --- |
itisnotperfectbutstillbetterthantheoriginalut-
troducedinSection3.1.
|     |     |     |     |     |     |     | terance, | 2 if | it hasn’t | been | restored | or it | cannot |
| --- | --- | --- | --- | --- | --- | --- | -------- | ---- | --------- | ---- | -------- | ----- | ------ |
• PAC: the pick-and-combine model intro- help better the understanding, and 1 if it is worse
ducedinSection3.2. than the original utterance. The fluency score is
usedtoevaluatethefluencyofarestoredutterance.
WeadoptonelayerunidirectionalLSTMasthe
|                               |     |        |            |         |              |         | A3-pointscaleisadoptedandhigherisbetter. |        |       |             |          |              | We       |
| ----------------------------- | --- | ------ | ---------- | ------- | ------------ | ------- | ---------------------------------------- | ------ | ----- | ----------- | -------- | ------------ | -------- |
| encoderanddecoderofeachmodel. |     |        |            |         | Duringtrain- |         |                                          |        |       |             |          |              |          |
|                               |     |        |            |         |              |         | randomly                                 | select | three | hundred     | examples |              | from the |
| ing, the vocabulary           |     | size   | is set     | to 10K. | The          | size of |                                          |        |       |             |          |              |          |
|                               |     |        |            |         |              |         | test set                                 | for    | human | evaluation. | Five     | professional |          |
| each mini-batch               |     | is 64. | Parameters | are     | updated      | by      |                                          |        |       |             |          |              |          |
annotatorswhohaveatleastoneyear’sexperience
| Adam algorithm |     | (P and | Ba, | 2014) with | the | betas |     |     |     |     |     |     |     |
| -------------- | --- | ------ | --- | ---------- | --- | ----- | --- | --- | --- | --- | --- | --- | --- |
ontextannotationparticipateintheexperiment.
| set to 0.9      | and 0.999 | and                       | the | eps set  | to 1e-8.  | The |     |         |     |     |     |     |     |
| --------------- | --------- | ------------------------- | --- | -------- | --------- | --- | --- | ------- | --- | --- | --- | --- | --- |
| learning        | rate is   | 0.25 and                  | the | clipping | threshold | of  |     |         |     |     |     |     |     |
|                 |           |                           |     |          |           |     | 4.3 | Results |     |     |     |     |     |
| gradientsis0.1. |           | Thedropoutrateissetto0.5. |     |          |           | The |     |         |     |     |     |     |     |
AutomaticMetrics
wordembeddingsize,encoderhiddensizeandde-
coder hidden size are all set to 512. During the Scoresofeachmethodontheautomaticmetricare
inference stage, the checkpoint with smallest val- shown on Table 3. PAC model achieves the best
idation loss is chosen and the beam-search size is performance on the restoration precision, recall,
set to 5 for all methods. For the pick stage in the andF-scorefrom1-gramto3-grams. Therestora-
proposedapproach,weuseaBERTmodeltrained tion recall reflects how often does the model
on 200G high-quality news data from Tencent AI choose to restore the original utterance. As dis-
| Lab. |     |     |     |     |     |     | cussedinSection3.2,Seq2Seqmodelandpointer |     |     |     |     |     |     |
| ---- | --- | --- | --- | --- | --- | --- | ----------------------------------------- | --- | --- | --- | --- | --- | --- |
1828

|     |     |             | Example 1 |     |     |     | Example 2 |     |     |     | Example 3 |     |     |
| --- | --- | ----------- | --------- | --- | --- | --- | --------- | --- | --- | --- | --------- | --- | --- |
|     |     | 我这个样子也来相个亲喃 |           |     |     |     | 晚上了在上夜班   |     |     |     | 谁给你拍的     |     |     |
A
1 I am here for a blind date It’s late. I am working in night shift Who took it for you?
|     |     |     | 会煮饭加100分 |     |     |     | 早安世界 |     |     |     | 朋友抓拍 |     |     |
| --- | --- | --- | -------- | --- | --- | --- | ---- | --- | --- | --- | ---- | --- | --- |
B
1 Being able to cook will add 100 points for you Morning, the world My friend took the snapshot
抓拍的够写意给了别人脑补的空间
|     |     |     | 这个技能竟然100分 |     |     |     | 早   |     |     |     |     |     |     |
| --- | --- | --- | ---------- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
A The snapshot is so atmo s p h e r ic   t h a t people could free their
2 I can’t believe this skill is worth 100 points Morning i m a g i n a t i o n
|     |     |     | 我喜欢这个技能 |     |     |     | 乃是要通宵么 |     |     | 要的就是这个效果 |     |     |     |
| --- | --- | --- | ------- | --- | --- | --- | ------ | --- | --- | -------- | --- | --- | --- |
B I like the skill Are you going to work overnight? That is what I want
2
|     |     | 我也喜欢希望能做好 |     |     |     |     | 上到8点钟 |     | 你确定吗我怎么觉得其实是没拍好 |     |     |     |     |
| --- | --- | --------- | --- | --- | --- | --- | ----- | --- | --------------- | --- | --- | --- | --- |
A I also like it and hope I could do well Until 8 a.m. Are you sure? Why do I feel it was just a mistake
3
你确定要的就是这种效果吗我怎么觉得其实是没拍好
|     |     | 我也喜欢会煮饭这个技能希望能做好 |     |     |     |     | 上夜班到8点钟 |     |     |     |     |     |     |
| --- | --- | ---------------- | --- | --- | --- | --- | ------- | --- | --- | --- | --- | --- | --- |
Reference I also like the cooking skill and hope I could do well The night shift is until 8 a.m. Are you surethat is what you want? Why do I feel it was
just a mistake
|     |     |     |     |     |     |     | 夜班通宵上到8点钟 |     | 你确定要的就是这种效果吗我怎么觉得其实是没拍好 |     |     |     |     |
| --- | --- | --- | --- | --- | --- | --- | --------- | --- | ----------------------- | --- | --- | --- | --- |
我也喜欢煮饭这个技能希望能做好 The night shiftrequires working  Are you surethat is what you want? Why do I feel it was
| PAC | I also like the cooking skill and hope I could do well |               |     |     |     |     |                        |     |                 |     |                |     |     |
| --- | ------------------------------------------------------ | ------------- | --- | --- | --- | --- | ---------------------- | --- | --------------- | --- | -------------- | --- | --- |
|     |                                                        |               |     |     |     |     | overnight until 8 a.m. |     |                 |     | just a mistake |     |     |
|     |                                                        | 我也喜欢这个技能希望能做好 |     |     |     |     | 上到8点钟通宵                |     | 你确定吗我怎么觉得其实是没拍好 |     |                |     |     |
Pointer
I also like the skill and hope I could do well Working overnight until 8 a.m. Are you sure? Why do I feel it was just a mistake
|     |     | 我也喜欢这个技能100分希望能做好 |     |     |     |     | 上到8点钟 |     | 你确定吗我怎么觉得其实是没拍好 |     |     |     |     |
| --- | --- | ----------------- | --- | --- | --- | --- | ----- | --- | --------------- | --- | --- | --- | --- |
Syntactic I also like the skill 100 points and hope I could do well Until 8 a.m. Are you sure? Why do I feel it was just a mistake
|     |     | 我也喜欢希望能做好 |     |     |     |     | 通宵上到8点钟 |     | 你确定吗我怎么觉得其实是没拍好 |     |     |     |     |
| --- | --- | --------- | --- | --- | --- | --- | ------- | --- | --------------- | --- | --- | --- | --- |
Seq2Seq
I also like it and hope I could do well Working overnight until 8 a.m. Are you sure? Why do I feel it was just a mistake
Table5: Examplesforincompleteutterancerestoration. A toB arepreviousutterancesandA istheoriginal
|     |     |     |     |     |     |     | 1 2 |     |     |     |     | 3   |     |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
utterance. The proposed PAC model could accurately identify pertinent words even those words appear at the
beginningoftheconversationlikeExample2.
| generative                   | network  |         | tend to | directly          | copy     | the orig- | 4.4 Casestudy |             |        |          |             |                |         |
| ---------------------------- | -------- | ------- | ------- | ----------------- | -------- | --------- | ------------- | ----------- | ------ | -------- | ----------- | -------------- | ------- |
| inal utterance,              |          | instead | of      | taking            | risks to | choose    |               |             |        |          |             |                |         |
|                              |          |         |         |                   |          |           | Table 5       | shows       | some   | examples | of          | the incomplete |         |
| wordsfrompreviousutterances. |          |         |         | Restorationrecall |          |           |               |             |        |          |             |                |         |
|                              |          |         |         |                   |          |           | utterance     | restoration |        | among    | different   | models.        | At      |
| scores                       | of these | models  | can     | prove this        | claim.   | PAC       |               |             |        |          |             |                |         |
|                              |          |         |         |                   |          |           | a closer      | look        | to the | restored | utterances, |                | we find |
modelisalsohigherthanothermodelsinrestora-
|                 |     |                 |       |          |           |      | PAC model | is      | capable  | of understanding |          |     | the con- |
| --------------- | --- | --------------- | ----- | -------- | --------- | ---- | --------- | ------- | -------- | ---------------- | -------- | --- | -------- |
| tion precision. |     | It demonstrates |       | that     | the words |      | se-       |         |          |                  |          |     |          |
|                 |     |                 |       |          |           |      | versation | context | and      | correctly        | identify |     | omitted  |
| lected by       | the | PAC             | model | are more | accurate  | than |           |         |          |                  |          |     |          |
|                 |     |                 |       |          |           |      | concepts  | from    | multiple | possible         | choices. |     | In Ex-   |
thatofothermodels.
ample1,noneexceptPACmodelcansuccessfully
WealsoreporttheBLEUandROUGEscoreof restore the word “cooking” from previous utter-
| eachmodel. |          | PACmodelalsoachievesthehighest |          |     |        |          |                                            |       |          |          |     |             |     |
| ---------- | -------- | ------------------------------ | -------- | --- | ------ | -------- | ------------------------------------------ | ----- | -------- | -------- | --- | ----------- | --- |
|            |          |                                |          |     |        |          | ances. InExample2,mostmodelscanonlyextract |       |          |          |     |             |     |
| scores     | in these | metrics.                       | However, |     | scores | of other |                                            |       |          |          |     |             |     |
|            |          |                                |          |     |        |          | the word                                   | “stay | up” from | previous |     | utterances, | and |
models are comparatively high because these two theyfailtogenerateafluentutterance. Incontrast,
metricstakeeachgraminthereferenceasequally the PAC model picks the correct words from pre-
| important. | It  | illustrates | the | necessity | of  | the pro- |     |     |     |     |     |     |     |
| ---------- | --- | ----------- | --- | --------- | --- | -------- | --- | --- | --- | --- | --- | --- | --- |
viousutterancesandgeneratesamorefluentutter-
posedevaluationmetrics. ance. As for Example 3, only the PAC model can
|     |     |     |     |     |     |     | correctly | restore | the original |     | utterance. |     | This sce- |
| --- | --- | --- | --- | --- | --- | --- | --------- | ------- | ------------ | --- | ---------- | --- | --------- |
HumanEvaluation nario also supports our analysis at the beginning
ofsection3.2thatvanillamodelshaveatendency
Results of the human evaluation are shown in Ta- toregeneratetheoriginalutterance.
| ble 4. The | proposed |     | method   | has the | highest  | qual- |             |        |                |          |            |         |      |
| ---------- | -------- | --- | -------- | ------- | -------- | ----- | ----------- | ------ | -------------- | -------- | ---------- | ------- | ---- |
|            |          |     |          |         |          |       | We conclude |        | an interesting |          | phenomenon |         | from |
| ity score  | among    | all | methods. | We      | find the | model |             |        |                |          |            |         |      |
|            |          |     |          |         |          |       | thiscase    | study: | onlythe        | PACmodel |            | ownsthe | ca-  |
withthehigherscoreinhumanevaluationalsohas
|          |             |          |        |               |       |        | pability | to extract                       | omitted | words |     | from very | early |
| -------- | ----------- | -------- | ------ | ------------- | ----- | ------ | -------- | -------------------------------- | ------- | ----- | --- | --------- | ----- |
| a higher | restoration |          | score. | This tendency |       | demon- |          |                                  |         |       |     |           |       |
|          |             |          |        |               |       |        | context. | Othermodelsmerelychoosewordsfrom |         |       |     |           |       |
| strates  | that the    | proposed | metric | makes         | sense | and    |          |                                  |         |       |     |           |       |
thelatestutteranceexactlybeforetheoriginalone,
| is practical | in  | this | task. | As for | the fluency, |     | all        |     |           |                      |     |     |     |
| ------------ | --- | ---- | ----- | ------ | ------------ | --- | ---------- | --- | --------- | -------------------- | --- | --- | --- |
|              |     |      |       |        |              |     | namelytheB | 2   | inTable5. | Thisgreatcontextcom- |     |     |     |
models except the Seq2Seq model achieve a sim- prehensionabilityisbenefitfromthepickprocess
| ilar score. | The | reason | why | the score | of  | the PAC |     |     |     |     |     |     |     |
| ----------- | --- | ------ | --- | --------- | --- | ------- | --- | --- | --- | --- | --- | --- | --- |
thatidentifieswordsfrompreviousutterances.
modelisslightlylowerthanthesyntacticmodelis
that the fluency score follows a principle that the 5 ImprovingExistingDialogueSystems
| more you | do, | the more | mistakes | you | make. | Flu- |     |     |     |     |     |     |     |
| -------- | --- | -------- | -------- | --- | ----- | ---- | --- | --- | --- | --- | --- | --- | --- |
encyoforiginalutterancesishigh,somodelswith The main motivation for incomplete utterance
lowerrecallmaygethigherfluency. restoration is to facilitate dialogue systems better
1829

understanding conversation context and generate MMI Better Similar Worse NR
betterresponses. Thus,weconductanotherexper- Syntactic 14.97 12.16 2.81 70.06
imenttoevaluateiftheresponsequalityofsingle- Seq2Seq 19.45 15.95 5.32 59.28
turnandmulti-turndialoguesystemsimprovesaf- Pointer 21.25 16.51 5.35 56.89
terincompleteutterancerestoration. PAC 28.82 21.95 6.12 43.11
5.1 Settings Table 6: Human evaluation on response quality from
We applied the proposed PAC model to a single- the single-turn dialogue system after restoration. All
numbersareinpercentage(%),andNRrepresentsNot
| turn and    | a multi-turn |               | response | generation  |     | model    |           |                       |     |     |     |     |     |
| ----------- | ------------ | ------------- | -------- | ----------- | --- | -------- | --------- | --------------------- | --- | --- | --- | --- | --- |
|             |              |               |          |             |     |          | Restored. | BotharesameforTable7. |     |     |     |     |     |
| to evaluate | its          | effectiveness |          | on dialogue |     | systems. |           |                       |     |     |     |     |     |
Detailsareshownasfollows:
|     |     |     |     |     |     |     | SMN | Better |     | Similar | Worse |     | NR  |
| --- | --- | --- | --- | --- | --- | --- | --- | ------ | --- | ------- | ----- | --- | --- |
• MMI: a state-of-the-art single-turn response Syntactic 13.17 10.18 6.59 70.06
generation model (Li et al., 2016). It adopts Seq2Seq 13.77 18.56 8.38 59.28
|     |         |     |        |             |     |          | Pointer | 16.17 |     | 16.76 | 10.18 |     | 56.89 |
| --- | ------- | --- | ------ | ----------- | --- | -------- | ------- | ----- | --- | ----- | ----- | --- | ----- |
| the | maximum |     | mutual | information |     | (MMI) as |         |       |     |       |       |     |       |
the objective function to prevent generating PAC 27.74 17.37 11.78 43.11
| generalresponses. |     |     | NoteMMImodeldoesnot |     |     |     |     |     |     |     |     |     |     |
| ----------------- | --- | --- | ------------------- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
have access to the dialogue context. It only Table 7: Human evaluation on response quality from
takestheoriginalutteranceastheinput. themulti-turndialoguesystemafterrestoration.
| • SMN: |     | the sequential |     | matching |     | network |              |         |      |     |        |      |       |
| ------ | --- | -------------- | --- | -------- | --- | ------- | ------------ | ------- | ---- | --- | ------ | ---- | ----- |
|        |     |                |     |          |     |         | the response | quality | does | not | change | much | after |
(SMN)isastate-of-the-artmulti-turnrerank-
|     |          |          |     |       |     |             | the restoration, |     | it will | be regarded |     | as ”similar”. |     |
| --- | -------- | -------- | --- | ----- | --- | ----------- | ---------------- | --- | ------- | ----------- | --- | ------------- | --- |
| ing | modeling | proposed |     | by Wu | et  | al. (2017). |                  |     |         |             |     |               |     |
Thequeryexpandedwithkeywordsisusedto Otherwise, it will be judged as ”worse”. Utter-
|          |     |         |          |             |     |      | ances that | are | not restored |     | are judged |     | as ”Not |
| -------- | --- | ------- | -------- | ----------- | --- | ---- | ---------- | --- | ------------ | --- | ---------- | --- | ------- |
| retrieve |     | top 100 | response | candidates. |     | When |            |     |              |     |            |     |         |
Restored”(NR).
| reranking, |      | SMN       | first | matches  |          | a response |     |     |     |     |     |     |     |
| ---------- | ---- | --------- | ----- | -------- | -------- | ---------- | --- | --- | --- | --- | --- | --- | --- |
| with       | each | utterance | and   | distills | matching | in-        |     |     |     |     |     |     |     |
formation into a vector. The vectors are Note that we also train a generative multi-turn
responsegenerationmodel(Serbanetal.,2016)on
| then | accumulated |        | through |        | a recurrent | neu-   |                      |     |                          |     |     |     |     |
| ---- | ----------- | ------ | ------- | ------ | ----------- | ------ | -------------------- | --- | ------------------------ | --- | --- | --- | --- |
|      |             |        |         |        |             |        | thecollecteddataset. |     | Butgeneratedresponsesare |     |     |     |     |
| ral  | network     | (RNN). | The     | hidden | states      | of the |                      |     |                          |     |     |     |     |
RNN is used to calculate the final matching not clear and coherent enough to understand. As
score. In our experiments, SMN is applied a result, no human study is further conducted for
suchapproach.
torerankcandidatesbytakingtheoriginalut-
teranceandconversationcontextasmodelin-
| puts. | The | candidate |     | with the | highest | match- | 5.2 Results |     |     |     |     |     |     |
| ----- | --- | --------- | --- | -------- | ------- | ------ | ----------- | --- | --- | --- | --- | --- | --- |
ingscoreischosenastheresponse.
|       |       |              |     |     |         |       | Evaluation | results       | of  | single-turn |         | and multi-turn |        |
| ----- | ----- | ------------ | --- | --- | ------- | ----- | ---------- | ------------- | --- | ----------- | ------- | -------------- | ------ |
|       |       |              |     |     |         |       | dialogue   | systems       | are | shown       | in      | Table          | 6 and  |
| • MMI | after | Restoration: |     |     | The MMI | model |            |               |     |             |         |                |        |
|       |       |              |     |     |         |       | Table 7,   | respectively. |     | Both        | systems | get            | better |
takestherestoredutteranceastheinput.
|       |       |              |     |     |     |       | responses | after      | the restoration |     | process, |       | and PAC |
| ----- | ----- | ------------ | --- | --- | --- | ----- | --------- | ---------- | --------------- | --- | -------- | ----- | ------- |
|       |       |              |     |     |     |       | model is  | the most   | effective       |     | one. The | PAC   | model   |
| • SMN | after | Restoration: |     | The | SMN | model |           |            |                 |     |          |       |         |
|       |       |              |     |     |     |       | achieves  | the lowest |                 | NR, | which    | means | it can  |
takestherestoredutteranceandconversation
| contextasinputs. |     |     |     |     |     |     | restoremoreutterancesthanothermodels. |     |     |     |     |     | Mean- |
| ---------------- | --- | --- | --- | --- | --- | --- | ------------------------------------- | --- | --- | --- | --- | --- | ----- |
while,forsingle-turndialoguesystems,morethan
Threehundredrandomlyselectedconversations 50% queries get better responses when they are
from the test set are selected and restored by all restored, and only 10% get worse responses. For
models. Five annotators are asked to evaluate multi-turn dialogue systems, although the SMN
whether responses to restored utterances are already has the ability to understand conversation
more relevant and appropriate than those of the context,therestorationstillimprovestheresponse
original utterances. There are three choices for quality of nearly half of quires, and only about
the annotators: better, similar or worse. If the 20% responses get worse. The results prove that
response gets more appropriate or more relevant the proposed dataset and approach significantly
to the context, it will be judged as ”better”. If improvetheresponsequality.
1830

|     |     | Example 1 |     |     |     |     | Example 2 |     |     | Example 3 |     |     |
| --- | --- | --------- | --- | --- | --- | --- | --------- | --- | --- | --------- | --- | --- |
下午去哪儿逛逛我的小单反
|     |                                            |           |     |     |     | 明天就直奔西安来了                 |     |     |     | 这是啤酒节啊               |     |     |
| --- | ------------------------------------------ | --------- | --- | --- | --- | ------------------------- | --- | --- | --- | -------------------- | --- | --- |
| 𝐴   | Where shall I go with my DSLR camera this  |           |     |     |     |                           |     |     |     |                      |     |     |
| 1   |                                            | afternoon |     |     |     | Heading for Xi’antomorrow |     |     |     | What a beer festival |     |     |
|     |                                            | 火车站       |     |     |     | 最近雨后会暴热西安的定律              |     |     |     | 只有我一个人关注啤酒不错的吗       |     |     |
𝐵 1 Rail station It‘’l become very hot after the rain. It‘’s a rule in Xi’an. Am I the only one who finds the beer seems to be great?
|     |     | 不去那人太多了 |     |     |     | 要不要这么悲催的 |     |     |     | 你也可以去的 |     |     |
| --- | --- | ------- | --- | --- | --- | -------- | --- | --- | --- | ------ | --- | --- |
𝐴 2 No, there are too many people How miserable it is You can go as well
|     |     | 哈哈拍人头 |     |     |     | 肿么了你还没到 |     |     |     | 不喝酒 |     |     |
| --- | --- | ----- | --- | --- | --- | ------- | --- | --- | --- | --- | --- | --- |
𝐵 2
Hah, you can take photos of people What, you haven’t arrived yet? No drinking
(拍人头)不行不行镜头达不到
|     |     |     |     |     |     | 明早到(西安)呢现在在家 |     |     |     | (不喝酒)你可以去吃东西 |     |     |
| --- | --- | --- | --- | --- | --- | ------------ | --- | --- | --- | ------------ | --- | --- |
𝐴 3 No, the lens is not good enough (for taking  Will arrive (in Xi’an) tomorrow. Now I am home (If no drinking,) You can go and eat something
photos of people)
| MMI |     | 你达不到？ |     |     |     | 你在哪上班呢? |     |     |     | *没东西吃 |     |     |
| --- | --- | ----- | --- | --- | --- | ------- | --- | --- | --- | ----- | --- | --- |
Are you not good enough? Where do you work? *There is nothing to eat
| MMI+PAC |     | *那就别拍了 |     |     |     | *你在西安干嘛呢? |     |     |     | 我不喝酒的 |     |     |
| ------- | --- | ------ | --- | --- | --- | --------- | --- | --- | --- | ----- | --- | --- |
*Then try to take photos of something else *What are you doing in Xi’an? I do not drink
| SMN |     | 不行呗               |     |     |     | 你现在好好的啊           |     |     |     | *啥东西吃?        |     |     |
| --- | --- | ----------------- | --- | --- | --- | ----------------- | --- | --- | --- | ------------- | --- | --- |
|     |     | Just cannot do it |     |     |     | You look cool now |     |     |     | *What to eat? |     |     |
*带你高校一日游外加兴庆公园赏雪哈哈
SMN+PAC *不行也得行 *I will take you to enjoy the one day trip to colleges and  不喝酒那喝什么?
|     |     | *Yes, you can do it |     |     |     |     |     |     |     | What to drink if not the beer? |     |     |
| --- | --- | ------------------- | --- | --- | --- | --- | --- | --- | --- | ------------------------------ | --- | --- |
the beauty of snow in Park of Xingqing Palace
Table8: Acomparisonbetweentakingoriginalandrestoredutteranceastheinputquerytoaresponsegeneration
model. InA ,wordsinparenthesesarerestoredbyPACmodel. Responsesannotatedwith∗arebetter.
3
|     |     |     |     |     |     |     | approach | NSU resolution |     | as a Seq2Seq |     | learning |
| --- | --- | --- | --- | --- | --- | --- | -------- | -------------- | --- | ------------ | --- | -------- |
SomeexamplesareshowninTable8. Example problem. One type of NSU that draws extra at-
1 and 2 are cases where the response quality im- tention is ellipsis (Merchant, 2016; Kenyon-Dean
provesafterincompleteutterancerestoration. One etal.,2016;McShaneandBabkin,2016).
interestingresponseistheonefromSMN+PACin
|             |                                 |       |     |        |              |     | 6.2 Multi-turnDialogueSystems |     |     |     |     |     |
| ----------- | ------------------------------- | ----- | --- | ------ | ------------ | --- | ----------------------------- | --- | --- | --- | --- | --- |
| Example2.   | NotethattheParkofXingqingPalace |       |     |        |              |     |                               |     |     |     |     |     |
| is a famous | historic                        | relic | in  | Xi’an. | The dialogue |     |                               |     |     |     |     |     |
Manyefficientapproacheshavebeenproposedfor
| system | successfully | generates |     | a much | more | con- |     |     |     |     |     |     |
| ------ | ------------ | --------- | --- | ------ | ---- | ---- | --- | --- | --- | --- | --- | --- |
developingintelligentdialoguesystems(Heetal.,
creteandrelevantresponseafterrestoringthecity 2017; Shang et al., 2018; Tian et al., 2019; Cai
| nameXi’an. |     | Therearealsocaseswhereresponses |     |     |     |     |              |                                   |     |     |     |     |
| ---------- | --- | ------------------------------- | --- | --- | --- | --- | ------------ | --------------------------------- | --- | --- | --- | --- |
|            |     |                                 |     |     |     |     | etal.,2019). | Formulti-turndialoguesystems,Ser- |     |     |     |     |
becomeworseevenifthemodelcorrectlyrestores
banetal.(2016)andXingetal.(2018)adopthier-
omitted words, as shown in Example 3. One pos- archical neural networks to model context. Tian
sible explanation is in this case the restored part et al. (2017) conduct an extensive comparison
| is less important |     | than | the original | utterance. |     | This |                |         |     |           |         |        |
| ----------------- | --- | ---- | ------------ | ---------- | --- | ---- | -------------- | ------- | --- | --------- | ------- | ------ |
|                   |     |      |              |            |     |      | among existing | methods |     | and found | context | infor- |
motivatesustofindmorestrategiestoalleviatethis
|     |     |     |     |     |     |     | mation is | conducive | for | neural networks |     | to gen- |
| --- | --- | --- | --- | --- | --- | --- | --------- | --------- | --- | --------------- | --- | ------- |
issueinfuturestudies,suchastrainingtherestora- eratelonger,moremeaningfulanddiversereplies.
| tion model | and | response | generation |     | model | in an |     |     |     |     |     |     |
| ---------- | --- | -------- | ---------- | --- | ----- | ----- | --- | --- | --- | --- | --- | --- |
Wuetal.(2017)andZhangetal.(2018)utilizethe
| end-to-end | manner | or  | deploying | a ranking |     | model |         |             |     |            |         |     |
| ---------- | ------ | --- | --------- | --------- | --- | ----- | ------- | ----------- | --- | ---------- | ------- | --- |
|            |        |     |           |           |     |       | context | information | via | a matching | network | and |
tochoosethebetterresponse. rerank the retrieved responses. Zhou et al. (2018)
investigatematchingaresponsewithitsmulti-turn
6 RelatedWork
|     |     |     |     |     |     |     | context | using dependency |     | information |     | based en- |
| --- | --- | --- | --- | --- | --- | --- | ------- | ---------------- | --- | ----------- | --- | --------- |
6.1 Non-sententialUtteranceResolution tirely on attention. Most of these studies model
thedialoguecontextinformationasanextrainput
| In addition       |          | to a further | corpus    | and    | taxonomy |        |                 |             |            |              |       |          |
| ----------------- | -------- | ------------ | --------- | ------ | -------- | ------ | --------------- | ----------- | ---------- | ------------ | ----- | -------- |
|                   |          |              |           |        |          |        | in the response |             | generation | or response  |       | matching |
| study, Ferna´ndez |          | et al.       | (2007)    | design | a series | of     |                 |             |            |              |       |          |
|                   |          |              |           |        |          |        | process.        | Our method, |            | on the other | hand, | tries to |
| linguistic        | features | to           | determine | the    | NSU      | class. |                 |             |            |              |       |          |
understandthecontextbyrestoringtheincomplete
| Dragone    | (2015);  | Dragone | and | Lison           | (2016) | ex-   |           |                   |     |              |     |          |
| ---------- | -------- | ------- | --- | --------------- | ------ | ----- | --------- | ----------------- | --- | ------------ | --- | -------- |
|            |          |         |     |                 |        |       | utterance | to a context-free |     | and complete |     | form. It |
| tend these | features | for     | NSU | classification. |        | Raghu |           |                   |     |              |     |          |
canbecomplementarytoabovestudies.
| et al. (2015)  |     | propose                     | generating  | NSU  | resolution |      |              |     |     |     |     |     |
| -------------- | --- | --------------------------- | ----------- | ---- | ---------- | ---- | ------------ | --- | --- | --- | --- | --- |
| fromtemplates. |     | PoulamiDebnath(2018)designa |             |      |            |      |              |     |     |     |     |     |
|                |     |                             |             |      |            |      | 7 Conclusion |     |     |     |     |     |
| set of rules   | to  | classify                    | and restore | NSUs | for        | cus- |              |     |     |     |     |     |
tomer support systems. All methods above heav- In this paper, we propose to facilitate the com-
ily rely on the syntactic structure or frequent pat- prehension of conversation context by restor-
terns observed empirically, which may not scale ing incomplete utterances. A large-scale dataset
wellforunseendomains. KumarandJoshi(2016) Restoration-200K, which consists of multi-turn
1831

conversations for open-domain dialogue systems, He He, Anusha Balakrishnan, Mihail Eric, and Percy
|                                  |     |     |             |     | Liang.2017. | Learningsymmetriccollaborativedia- |     |     |     |     |
| -------------------------------- | --- | --- | ----------- | --- | ----------- | ---------------------------------- | --- | --- | --- | --- |
| iscollectedandmanuallyannotated. |     |     | Basedonthis |     |             |                                    |     |     |     |     |
dataset, the proposed pick-and-combine method logueagentswithdynamicknowledgegraphembed-
dings. InProceedingsofthe55thAnnualMeetingof
| achieves | promising | results on | the incomplete | ut- |     |     |     |     |     |     |
| -------- | --------- | ---------- | -------------- | --- | --- | --- | --- | --- | --- | --- |
theAssociationforComputationalLinguistics(Vol-
terancerestorationtask. Experimentalresultsalso ume1: LongPapers),volume1,pages1766–1776.
| demonstrate | that | the annotated | dataset | and the |     |     |     |     |     |     |
| ----------- | ---- | ------------- | ------- | ------- | --- | --- | --- | --- | --- | --- |
KianKenyon-Dean,JackieChiKitCheung,andDoina
proposedapproachsignificantlyimproveresponse
|     |     |     |     |     | Precup. | 2016. | Verb phrase | ellipsis | resolution | us- |
| --- | --- | --- | --- | --- | ------- | ----- | ----------- | -------- | ---------- | --- |
qualityforexistingdialoguesystems. ing discriminative and margin-infused algorithms.
|     |     |     |     |     | In Proceedings |     | of the 2016 | Conference | on  | Empiri- |
| --- | --- | --- | --- | --- | -------------- | --- | ----------- | ---------- | --- | ------- |
calMethodsinNaturalLanguageProcessing,pages
| References |     |     |     |     | 1734–1743. |     |     |     |     |     |
| ---------- | --- | --- | --- | --- | ---------- | --- | --- | --- | --- | --- |
DengCai,YanWang,WeiBi,ZhaopengTu,Xiaojiang Vineet Kumar and Sachindra Joshi. 2016. Non-
Liu,WaiLam,andShumingShi.2019. Skeleton-to- sentential question resolution using sequence to se-
response: Dialogue generation guided by retrieval quencelearning. InProceedingsofCOLING2016,
| memory. | InProceedingsofthe2019Conferenceof |     |     |     |     |     |     |     |     |     |
| ------- | ---------------------------------- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
the26thInternationalConferenceonComputational
the North American Chapter of the Association for Linguistics: TechnicalPapers,pages2022–2031.
ComputationalLinguistics:HumanLanguageTech-
nologies, Volume1(LongandShortPapers), pages Vineet Kumar and Sachindra Joshi. 2017. Incom-
1219–1228. plete follow-up question resolution using retrieval
|     |     |     |     |     | based sequence |     | to sequence | learning. | In Proceed- |     |
| --- | --- | --- | --- | --- | -------------- | --- | ----------- | --------- | ----------- | --- |
Jaime G Carbonell. 1983. Discourse pragmatics and ings of the 40th International ACM SIGIR Confer-
ellipsis resolution in task-oriented natural language ence on Research and Development in Information
| interfaces. | InProceedingsofthe21stannualmeet- |     |     |     |     |     |     |     |     |     |
| ----------- | --------------------------------- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
Retrieval,pages705–714.ACM.
| ing on | Association | for Computational | Linguistics, |     |     |     |     |     |     |     |
| ------ | ----------- | ----------------- | ------------ | --- | --- | --- | --- | --- | --- | --- |
pages164–168.AssociationforComputationalLin- JiweiLi,MichelGalley,ChrisBrockett,JianfengGao,
| guistics. |     |     |     |     | andBillDolan.2016.                       |     | Adiversity-promotingobjec- |     |     |        |
| --------- | --- | --- | --- | --- | ---------------------------------------- | --- | -------------------------- | --- | --- | ------ |
|           |     |     |     |     | tivefunctionforneuralconversationmodels. |     |                            |     |     | InPro- |
Jacob Devlin, Ming-Wei Chang, Kenton Lee, and ceedingsofthe2016ConferenceoftheNorthAmer-
Kristina Toutanova. 2019. Bert: Pre-training of ican Chapter of the Association for Computational
deepbidirectionaltransformersforlanguageunder-
|           |                                    |     |     |     | Linguistics: | Human | Language | Technologies, |     | pages |
| --------- | ---------------------------------- | --- | --- | --- | ------------ | ----- | -------- | ------------- | --- | ----- |
| standing. | InProceedingsofthe2019Conferenceof |     |     |     |              |       |          |               |     |       |
110–119.
| the North | American | Chapter | of the Association | for |     |     |     |     |     |     |
| --------- | -------- | ------- | ------------------ | --- | --- | --- | --- | --- | --- | --- |
ComputationalLinguistics:HumanLanguageTech- Chin-Yew Lin. 2004. Rouge: A package for auto-
nologies, Volume1(LongandShortPapers), pages maticevaluationofsummaries. TextSummarization
| 4171–4186. |     |     |     |     | BranchesOut. |     |     |     |     |     |
| ---------- | --- | --- | --- | --- | ------------ | --- | --- | --- | --- | --- |
PaoloDragone.2015. Non-sententialutterancesindi- Marjorie McShane and Petr Babkin. 2016. Detection
alogue:Experimentsinclassificationandinterpreta- and resolution of verb phrase ellipsis. LiLT (Lin-
guisticIssuesinLanguageTechnology),13.
tion. Master’sthesis,SapienzaUniversityofRome.
Paolo Dragone and Pierre Lison. 2016. Classification JasonMerchant.2016. Ellipsis: Asurveyofanalytical
and resolution of non-sentential utterances in dia- approaches. Handbook of ellipsis. Oxford: Oxford
logue. ItalianJournalofComputationalLinguistics, UniversityPress.Ms.UniversityofChicago.
2(1):45–62.
|     |     |     |     |     | Kingma Diederik |     | P and Jimmy | Ba. 2014. | Adam: | A   |
| --- | --- | --- | --- | --- | --------------- | --- | ----------- | --------- | ----- | --- |
Raquel Ferna´ndez, Jonathan Ginzburg, and Shalom methodforstochasticoptimization.
| Lappin. | 2005. | Using machine | learning | for non- |     |     |     |     |     |     |
| ------- | ----- | ------------- | -------- | -------- | --- | --- | --- | --- | --- | --- |
sentential utterance classification. In 6th SIGdial KishorePapineni,SalimRoukos,ToddWard,andWei-
WorkshoponDiscourseandDialogue. JingZhu.2002. Bleu: amethodforautomaticeval-
|                    |     |                                     |     |        | uation of | machine | translation. | In             | Proceedings | of     |
| ------------------ | --- | ----------------------------------- | --- | ------ | --------- | ------- | ------------ | -------------- | ----------- | ------ |
| Raquel Ferna´ndez, |     | Jonathan Ginzburg,                  | and | Shalom |           |         |              |                |             |        |
|                    |     |                                     |     |        | the 40th  | annual  | meeting      | on association | for         | compu- |
| Lappin.2007.       |     | Classifyingnon-sententialutterances |     |        |           |         |              |                |             |        |
tationallinguistics,pages311–318.Associationfor
indialogue: Amachinelearningapproach. Compu- ComputationalLinguistics.
tationalLinguistics,33(3):397–427.
|     |     |     |     |     | Harshawardhan | M.  | Wabgaonkar | Poulami | Debnath, |     |
| --- | --- | --- | --- | --- | ------------- | --- | ---------- | ------- | -------- | --- |
Johann Hauswald, Michael A Laurenzano, Yunqi ShubhashisSengupta.2018.
| Zhang, | Cheng | Li, Austin Rovinski, | Arjun | Khu- |     |     |     |     |     |     |
| ------ | ----- | -------------------- | ----- | ---- | --- | --- | --- | --- | --- | --- |
rana, RonaldGDreslinski, TrevorMudge, Vinicius Dinesh Raghu, Sathish Indurthi, Jitendra Ajmera, and
Petrucci,LingjiaTang,etal.2015. Sirius: Anopen Sachindra Joshi. 2015. A statistical approach for
end-to-end voice and vision personal assistant and non-sententialutteranceresolutionforinteractiveqa
itsimplicationsforfuturewarehousescalecomput- system. In Proceedings of the 16th Annual Meet-
ers. In ACM SIGPLAN Notices, volume 50, pages ing of the Special Interest Group on Discourse and
| 223–238.ACM. |     |     |     |     | Dialogue,pages335–343. |     |     |     |     |     |
| ------------ | --- | --- | --- | --- | ---------------------- | --- | --- | --- | --- | --- |
1832

IulianVSerban, AlessandroSordoni, YoshuaBengio,
AaronCourville,andJoellePineau.2016. Building
end-to-end dialogue systems using generative hier-
archical neural network models. In Thirtieth AAAI
ConferenceonArtificialIntelligence.
Mingyue Shang, Zhenxin Fu, Nanyun Peng, Yansong
Feng, Dongyan Zhao, and Rui Yan. 2018. Learn-
ing to converse with noisy data: Generation with
calibration. In Proceedings of the Twenty-Seventh
International Joint Conference on Artificial Intel-
ligence, IJCAI-18, pages 4338–4344. International
JointConferencesonArtificialIntelligenceOrgani-
zation.
Zhiliang Tian, Wei Bi, Xiaopeng Li, and Nevin L
Zhang. 2019. Learning to abstract for memory-
augmented conversational response generation. In
Proceedings of the 57th Conference of the Associ-
ation for Computational Linguistics, pages 3816–
3825.
Zhiliang Tian, Rui Yan, Lili Mou, Yiping Song, Yan-
songFeng,andDongyanZhao.2017. Howtomake
contextmoreuseful? anempiricalstudyoncontext-
aware neural conversational models. In Proceed-
ings of the 55th Annual Meeting of the Association
forComputationalLinguistics(Volume2: ShortPa-
pers),volume2,pages231–236.
Yu Wu, Wei Wu, Chen Xing, Ming Zhou, and Zhou-
jun Li. 2017. Sequential matching network: A
new architecture for multi-turn response selection
in retrieval-based chatbots. In Proceedings of the
55thAnnualMeetingoftheAssociationforCompu-
tationalLinguistics(Volume1: LongPapers),pages
496–505.
ChenXing, YuWu, WeiWu, YalouHuang, andMing
Zhou. 2018. Hierarchical recurrent attention net-
work for response generation. In Thirty-Second
AAAIConferenceonArtificialIntelligence.
Zhuosheng Zhang, Jiangtong Li, Pengfei Zhu, Hai
Zhao, and Gongshen Liu. 2018. Modeling multi-
turn conversation with deep utterance aggregation.
InProceedingsofthe27thInternationalConference
onComputationalLinguistics,pages3740–3752.
Xiangyang Zhou, Lu Li, Daxiang Dong, Yi Liu, Ying
Chen, Wayne Xin Zhao, Dianhai Yu, and Hua Wu.
2018. Multi-turn response selection for chatbots
withdeepattentionmatchingnetwork. InProceed-
ings of the 56th Annual Meeting of the Association
forComputationalLinguistics(Volume1: LongPa-
pers),volume1,pages1118–1127.
1833